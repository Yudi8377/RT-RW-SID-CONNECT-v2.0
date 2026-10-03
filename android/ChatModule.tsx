import React, {useEffect, useMemo, useState} from "react";
import {ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import {Session} from "@supabase/supabase-js";

const B64=(value:Uint8Array):string=>naclUtil.encodeBase64(value);
const U8=(value:string):Uint8Array=>naclUtil.decodeBase64(value);
const UTF8=(value:string):Uint8Array=>naclUtil.decodeUTF8(value);
const box=nacl.box; // E2EE v1: established NaCl primitive; no custom cryptography

export default function ChatModule({visible,onClose,sb,session,profile}:any){
  const [device,setDevice]=useState<any>(null),[conversations,setConversations]=useState<any[]>([]),[active,setActive]=useState<any>(null);
  const [messages,setMessages]=useState<any[]>([]),[text,setText]=useState(""),[phone,setPhone]=useState(""),[busy,setBusy]=useState(false),[newChat,setNewChat]=useState(false);
  const [secret,setSecret]=useState<Uint8Array|null>(null),[notice,setNotice]=useState("");

  useEffect(()=>{if(visible&&session) boot();},[visible,session?.user?.id]);

  async function boot(){
    const key=await loadDeviceKey();
    setSecret(key.secret);setDevice(key.device);
    await loadConversations();
  }
  async function loadDeviceKey(){
    const sk=await SecureStore.getItemAsync("sv.chat.secret.v1");
    const pk=await SecureStore.getItemAsync("sv.chat.public.v1");
    let secretKey:Uint8Array, publicKey:string;
    if(sk&&pk){secretKey=U8(sk);publicKey=pk;}
    else{const kp=nacl.box.keyPair();secretKey=kp.secretKey;publicKey=B64(kp.publicKey);await SecureStore.setItemAsync("sv.chat.secret.v1",B64(secretKey));await SecureStore.setItemAsync("sv.chat.public.v1",publicKey);}
    let q=await sb.from("sv_chat_devices").select("id,user_id,public_key,device_name").eq("user_id",session.user.id).eq("public_key",publicKey).maybeSingle();
    if(q.error||!q.data){q=await sb.from("sv_chat_devices").insert({user_id:session.user.id,public_key:publicKey,device_name:"Android"}).select("id,user_id,public_key,device_name").single();}
    if(q.error) throw new Error(q.error.message);
    return {secret:secretKey,device:q.data};
  }
  async function loadConversations(){
    const m=await sb.from("sv_chat_members").select("conversation_id,member_role").eq("user_id",session.user.id).is("left_at",null);
    if(m.error){setNotice(m.error.message);return;}
    const ids=(m.data||[]).map((x:any)=>x.conversation_id); if(!ids.length){setConversations([]);return;}
    const c=await sb.from("sv_chat_conversations").select("id,kind,title,updated_at,created_by").in("id",ids).order("updated_at",{ascending:false});
    if(!c.error)setConversations(c.data||[]);
  }
  async function startChat(){
    if(!phone.trim()){setNotice("Masukkan nomor HP warga yang ingin dihubungi.");return;}
    setBusy(true);setNotice("");
    const r=await sb.rpc("sv_find_chat_recipient",{p_phone:phone.trim()});
    if(r.error||!r.data?.length){setNotice("Warga tidak ditemukan atau belum mengaktifkan perangkat chat.");setBusy(false);return;}
    const recipient=r.data[0];
    const c=await sb.from("sv_chat_conversations").insert({kind:"DIRECT",title:recipient.display_name,created_by:session.user.id}).select("id,kind,title,updated_at,created_by").single();
    if(c.error){setNotice(c.error.message);setBusy(false);return;}
    const members=await sb.from("sv_chat_members").insert([{conversation_id:c.data.id,user_id:session.user.id,member_role:"OWNER"},{conversation_id:c.data.id,user_id:recipient.user_id,member_role:"MEMBER"}]);
    if(members.error){await sb.from("sv_chat_conversations").delete().eq("id",c.data.id);setNotice(members.error.message);setBusy(false);return;}
    setNewChat(false);setPhone("");await loadConversations();openConversation(c.data);setBusy(false);
  }
  async function openConversation(c:any){
    setActive(c);await loadMessages(c.id);
    const channel=sb.channel("sv-chat-"+c.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"sv_chat_messages",filter:"conversation_id=eq."+c.id},()=>loadMessages(c.id)).subscribe();
    (c as any)._channel=channel;
  }
  async function loadMessages(conversationId:string){
    const r=await sb.from("sv_chat_messages").select("id,conversation_id,sender_user_id,sender_device_id,message_type,created_at,reply_to_id").eq("conversation_id",conversationId).is("deleted_at",null).order("created_at",{ascending:true}).limit(100);
    if(r.error){setNotice(r.error.message);return;}
    const rows=r.data||[]; if(!rows.length){setMessages([]);return;}
    const e=await sb.from("sv_chat_message_envelopes").select("message_id,recipient_device_id,nonce,ciphertext").in("message_id",rows.map((x:any)=>x.id)).eq("recipient_device_id",device?.id||"");
    const envBy=new Map((e.data||[]).map((x:any)=>[x.message_id,x]));
    const senderIds=[...new Set(rows.map((x:any)=>x.sender_device_id))];
    const d=await sb.from("sv_chat_devices").select("id,user_id,public_key").in("id",senderIds);
    const pub=new Map<string,string>((d.data||[]).map((x:any)=>[String(x.id),String(x.public_key)]));
    const decoded=rows.map((m:any)=>{
      const env:any=envBy.get(m.id);let body="[Pesan terenkripsi tidak dapat dibuka]";
      if(env&&secret){try{const parts=String(env.ciphertext).split("."); const plain=box.open(U8(parts[1]||""),U8(String(env.nonce)),U8(String(parts[0]||pub.get(String(m.sender_device_id))||"")),secret);if(plain)body=naclUtil.encodeUTF8(plain);}catch{}}
      return {...m,body,self:m.sender_user_id===session.user.id};
    });
    setMessages(decoded);
  }
  async function send(){
    const body=text.trim();if(!body||!active||!device||!secret)return;
    setText("");setBusy(true);
    const members=await sb.from("sv_chat_members").select("user_id").eq("conversation_id",active.id).is("left_at",null);
    if(members.error){setNotice(members.error.message);setBusy(false);return;}
    const users=(members.data||[]).map((x:any)=>x.user_id);
    const devices=await sb.from("sv_chat_devices").select("id,user_id,public_key").in("user_id",users).eq("active",true);
    if(devices.error||!devices.data?.length){setNotice("Perangkat penerima belum siap untuk enkripsi.");setBusy(false);return;}
    const m=await sb.from("sv_chat_messages").insert({conversation_id:active.id,sender_user_id:session.user.id,sender_device_id:device.id,message_type:"TEXT"}).select("id").single();
    if(m.error){setNotice(m.error.message);setBusy(false);return;}
    const envelopes=(devices.data||[]).map((d:any)=>{
      const eph=nacl.box.keyPair(),nonce=nacl.randomBytes(nacl.box.nonceLength);
      const cipher=box(UTF8(body),nonce,U8(String(d.public_key)),eph.secretKey);
      return {message_id:m.data.id,recipient_device_id:d.id,nonce:B64(nonce),ciphertext:B64(eph.publicKey)+"."+B64(cipher)};
    });
    const er=await sb.from("sv_chat_message_envelopes").insert(envelopes);
    if(er.error){setNotice("Pesan gagal diamankan dan tidak dikirim.");setBusy(false);return;}
    await sb.from("sv_chat_conversations").update({updated_at:new Date().toISOString()}).eq("id",active.id);
    await loadMessages(active.id);await loadConversations();setBusy(false);
  }

  useEffect(()=>()=>{if(active?._channel) sb.removeChannel(active._channel);},[active?.id]);

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={st.safe}><View style={st.header}><View><Text style={st.eyebrow}>NUSA CHAT</Text><Text style={st.title}>{active?.title||"Komunikasi warga"}</Text></View><Pressable onPress={onClose}><Text style={st.close}>Tutup</Text></Pressable></View>
    {!active?<ScrollView contentContainerStyle={st.list}>
      <View style={st.security}><Text style={st.securityTitle}>🔐 E2EE AKTIF</Text><Text style={st.securityText}>Isi pesan dienkripsi di perangkat. Server menyimpan ciphertext, bukan teks percakapan.</Text></View>
      <Pressable style={st.newButton} onPress={()=>setNewChat(true)}><Text style={st.newButtonText}>＋ Mulai percakapan</Text></Pressable>
      {!conversations.length?<View style={st.empty}><Text style={st.emptyTitle}>Belum ada percakapan</Text><Text style={st.emptyText}>Mulai chat dengan nomor HP warga yang sudah mengaktifkan NUSA CHAT.</Text></View>:conversations.map((c:any)=><Pressable key={c.id} style={st.chatRow} onPress={()=>openConversation(c)}><View style={st.avatar}><Text style={st.avatarText}>{String(c.title||"?").slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={st.chatTitle}>{c.title||"Percakapan"}</Text><Text style={st.chatMeta}>{c.kind==="DIRECT"?"Percakapan pribadi terenkripsi":"Ruang komunitas"}</Text></View><Text style={st.chev}>›</Text></Pressable>)}
    </ScrollView>:<View style={{flex:1}}><ScrollView contentContainerStyle={st.messages}>{messages.map((m:any)=><View key={m.id} style={[st.bubble,m.self?st.mine:st.theirs]}><Text style={[st.bubbleText,m.self&&{color:"#fff"}]}>{m.body}</Text><Text style={[st.time,m.self&&{color:"#C7D5CF"}]}>{new Date(m.created_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</Text></View>)}</ScrollView><View style={st.composer}><TextInput style={st.composeInput} value={text} onChangeText={setText} placeholder="Tulis pesan terenkripsi…" onSubmitEditing={send}/><Pressable style={st.send} onPress={send} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={st.sendText}>➤</Text>}</Pressable></View><Pressable style={st.back} onPress={()=>{if(active?._channel)sb.removeChannel(active._channel);setActive(null);loadConversations()}}><Text style={st.backText}>← Semua chat</Text></Pressable></View>}
    <Modal visible={newChat} transparent animationType="slide" onRequestClose={()=>setNewChat(false)}><View style={st.overlay}><View style={st.newSheet}><Text style={st.eyebrow}>CHAT PRIBADI</Text><Text style={st.sheetTitle}>Hubungi warga</Text><Text style={st.sheetText}>Masukkan nomor HP persis seperti yang terdaftar. Pencarian hanya mengembalikan kecocokan tepat.</Text><TextInput style={st.input} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" value={phone} onChangeText={setPhone}/>{notice?<Text style={st.notice}>{notice}</Text>:null}<Pressable style={st.newButton} onPress={startChat}><Text style={st.newButtonText}>{busy?"Menyiapkan enkripsi…":"Cari & mulai chat"}</Text></Pressable><Pressable style={st.cancel} onPress={()=>setNewChat(false)}><Text style={st.cancelText}>Batal</Text></Pressable></View></View></Modal>
    </SafeAreaView>
  </Modal>
}

const st=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F6F4EE"},header:{padding:18,borderBottomWidth:1,borderBottomColor:"#E0E6E2",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},eyebrow:{color:"#4D7467",fontSize:10,fontWeight:"900",letterSpacing:1.6},title:{color:"#16352C",fontSize:22,fontWeight:"900",marginTop:4},close:{color:"#356557",fontWeight:"900"},list:{padding:18,paddingBottom:50},security:{backgroundColor:"#E7EFEA",borderRadius:18,padding:16,marginBottom:14},securityTitle:{color:"#16352C",fontWeight:"900"},securityText:{color:"#52625B",fontSize:12,lineHeight:18,marginTop:5},newButton:{backgroundColor:"#356557",borderRadius:14,minHeight:48,alignItems:"center",justifyContent:"center",paddingHorizontal:16,marginBottom:12},newButtonText:{color:"#fff",fontWeight:"900"},empty:{padding:28,alignItems:"center"},emptyTitle:{color:"#16352C",fontSize:18,fontWeight:"900"},emptyText:{color:"#718079",textAlign:"center",lineHeight:19,marginTop:7},chatRow:{backgroundColor:"#fff",borderRadius:18,padding:13,marginBottom:9,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E0E6E2"},avatar:{width:48,height:48,borderRadius:24,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center",marginRight:12},avatarText:{color:"#356557",fontWeight:"900",fontSize:18},chatTitle:{color:"#16352C",fontWeight:"900",fontSize:15},chatMeta:{color:"#718079",fontSize:11,marginTop:3},chev:{color:"#4D7467",fontSize:24},messages:{padding:14,paddingBottom:90},bubble:{maxWidth:"82%",padding:11,borderRadius:16,marginBottom:8},mine:{alignSelf:"flex-end",backgroundColor:"#356557",borderBottomRightRadius:5},theirs:{alignSelf:"flex-start",backgroundColor:"#fff",borderBottomLeftRadius:5,borderWidth:1,borderColor:"#E0E6E2"},bubbleText:{color:"#263B33",fontSize:14,lineHeight:20},time:{fontSize:9,color:"#718079",alignSelf:"flex-end",marginTop:4},composer:{position:"absolute",bottom:36,left:10,right:10,flexDirection:"row",alignItems:"center",backgroundColor:"#fff",borderRadius:18,padding:6,borderWidth:1,borderColor:"#DCE4DF"},composeInput:{flex:1,paddingHorizontal:12,paddingVertical:10,color:"#16352C"},send:{width:42,height:42,borderRadius:21,backgroundColor:"#356557",alignItems:"center",justifyContent:"center"},sendText:{color:"#fff",fontSize:18,fontWeight:"900"},back:{position:"absolute",bottom:0,left:0,right:0,height:34,alignItems:"center",justifyContent:"center",backgroundColor:"#F6F4EE"},backText:{color:"#356557",fontWeight:"900"},overlay:{flex:1,backgroundColor:"rgba(22,53,44,.45)",justifyContent:"flex-end"},newSheet:{backgroundColor:"#F6F4EE",padding:22,paddingBottom:35,borderTopLeftRadius:28,borderTopRightRadius:28},sheetTitle:{color:"#16352C",fontSize:28,fontWeight:"900",marginTop:7},sheetText:{color:"#687770",lineHeight:19,marginTop:8},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE4DF",borderRadius:14,padding:13,marginTop:12,color:"#16352C"},notice:{color:"#A63D3D",fontSize:12,lineHeight:18,marginTop:8},cancel:{alignItems:"center",padding:12},cancelText:{color:"#356557",fontWeight:"900"}
});