import { assertEquals } from "jsr:@std/assert@1";
import { expectedScopeType, resolveOrganizationId, type Organization, type Territory } from "./scope.ts";

const village: Territory = { id: "village", parent_id: "district", territory_type: "VILLAGE", active: true };
const rw: Territory = { id: "rw", parent_id: "village", territory_type: "RW", active: true };
const rt: Territory = { id: "rt", parent_id: "rw", territory_type: "RT", active: true };
const district: Territory = { id: "district", parent_id: "regency", territory_type: "DISTRICT", active: true };
const orgs: Organization[] = [
  { id: "village-org", territory_id: "village", organization_type: "VILLAGE", active: true },
  { id: "inactive-org", territory_id: "district", organization_type: "DISTRICT", active: false },
];

Deno.test("role scope types are explicit and reject unknown roles", () => {
  assertEquals(expectedScopeType("RT_OPERATOR"), "RT");
  assertEquals(expectedScopeType("RW_REVIEWER"), "RW");
  assertEquals(expectedScopeType("DISTRICT_COORDINATOR"), "DISTRICT");
  assertEquals(expectedScopeType("PLATFORM_ADMIN"), null);
  assertEquals(expectedScopeType("UNKNOWN"), null);
});

Deno.test("RT and RW inherit the nearest village organization only", () => {
  assertEquals(resolveOrganizationId("RT_OPERATOR", rt, [rt, rw, village, district], orgs), "village-org");
  assertEquals(resolveOrganizationId("RW_REVIEWER", rw, [rw, village, district], orgs), "village-org");
});

Deno.test("role cannot be assigned to a territory of another type", () => {
  assertEquals(resolveOrganizationId("RT_OPERATOR", village, [village], orgs), null);
  assertEquals(resolveOrganizationId("VILLAGE_VALIDATOR", rt, [rt, rw, village], orgs), null);
});

Deno.test("village and regional roles require an active organization mapped to exact territory", () => {
  assertEquals(resolveOrganizationId("VILLAGE_VALIDATOR", village, [village], orgs), "village-org");
  assertEquals(resolveOrganizationId("DISTRICT_COORDINATOR", district, [district], orgs), null);
  const districtOrg = { id: "district-org", territory_id: "district", organization_type: "DISTRICT", active: true };
  assertEquals(resolveOrganizationId("DISTRICT_COORDINATOR", district, [district], [...orgs, districtOrg]), "district-org");
});

Deno.test("inactive target territory and inactive organization fail closed", () => {
  assertEquals(resolveOrganizationId("RT_OPERATOR", { ...rt, active: false }, [rt, rw, village], orgs), null);
  assertEquals(resolveOrganizationId("DISTRICT_COORDINATOR", district, [district], orgs), null);
});
