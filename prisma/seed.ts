import {
  PrismaClient,
  Prisma,
  Role,
  AssetStatus,
  Condition,
  MaintenanceType,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { generateAssetCode } from "../src/lib/assetCode";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) so re-seeding produces stable-ish demo data.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260928);
const randInt = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------------------
// Date helpers (relative to the real "now" at seed time).
// ---------------------------------------------------------------------------
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY);

/** Most recent completed monsoon (mid-August) at least ~40 days in the past. */
function lastMonsoon(): Date {
  const y = NOW.getFullYear();
  const thisYear = new Date(y, 7, 15); // Aug 15
  if (thisYear.getTime() < NOW.getTime() - 40 * DAY) return thisYear;
  return new Date(y - 1, 7, 15);
}

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------
const DIVISIONS = [
  { name: "R&B Division Ahmedabad", code: "AMD", circle: "Ahmedabad Circle" },
  { name: "R&B Division Surat", code: "SRT", circle: "Surat Circle" },
  { name: "R&B Division Vadodara", code: "VDR", circle: "Vadodara Circle" },
  { name: "R&B Division Rajkot", code: "RJK", circle: "Rajkot Circle" },
  { name: "R&B Division Gandhinagar", code: "GNR", circle: "Gandhinagar Circle" },
  { name: "R&B Division Bhuj", code: "BHJ", circle: "Bhuj (Kutch) Circle" },
];

const USERS = [
  { name: "Rajesh Patel", email: "admin@gov.in", password: "Admin@123", role: Role.ADMIN, div: null },
  { name: "Meera Shah", email: "manager@gov.in", password: "Manager@123", role: Role.MANAGER, div: "AMD" },
  { name: "Amit Desai", email: "officer@gov.in", password: "Officer@123", role: Role.OFFICER, div: "AMD" },
  { name: "Kiran Joshi", email: "manager2@gov.in", password: "Manager@123", role: Role.MANAGER, div: "SRT" },
  { name: "Neha Trivedi", email: "officer2@gov.in", password: "Officer@123", role: Role.OFFICER, div: "SRT" },
  { name: "Hardik Solanki", email: "manager3@gov.in", password: "Manager@123", role: Role.MANAGER, div: "VDR" },
  { name: "Bhavesh Chauhan", email: "manager4@gov.in", password: "Manager@123", role: Role.MANAGER, div: "RJK" },
  { name: "Dinesh Rao", email: "manager5@gov.in", password: "Manager@123", role: Role.MANAGER, div: "GNR" },
  { name: "Falguni Mehta", email: "manager6@gov.in", password: "Manager@123", role: Role.MANAGER, div: "BHJ" },
];

const CATEGORIES = [
  { name: "State Highway", code: "SH", usefulLifeYears: 20 },
  { name: "District Road", code: "DR", usefulLifeYears: 15 },
  { name: "Village Road", code: "VR", usefulLifeYears: 10 },
  { name: "Bridge", code: "BR", usefulLifeYears: 50 },
  { name: "Culvert", code: "CV", usefulLifeYears: 30 },
  { name: "Government Building", code: "BL", usefulLifeYears: 40 },
  { name: "Residential Quarters", code: "RQ", usefulLifeYears: 40 },
  { name: "Machinery", code: "MC", usefulLifeYears: 10 },
];

const LOCATIONS = [
  { name: "Ahmedabad City", district: "Ahmedabad", lat: 23.0225, lng: 72.5714, div: "AMD" },
  { name: "Sanand", district: "Ahmedabad", lat: 22.992, lng: 72.381, div: "AMD" },
  { name: "Surat Adajan", district: "Surat", lat: 21.1959, lng: 72.7933, div: "SRT" },
  { name: "Bardoli", district: "Surat", lat: 21.12, lng: 73.112, div: "SRT" },
  { name: "Vadodara Alkapuri", district: "Vadodara", lat: 22.3072, lng: 73.1812, div: "VDR" },
  { name: "Rajkot Race Course", district: "Rajkot", lat: 22.3039, lng: 70.8022, div: "RJK" },
  { name: "Gondal", district: "Rajkot", lat: 21.96, lng: 70.792, div: "RJK" },
  { name: "Gandhinagar Sector 11", district: "Gandhinagar", lat: 23.2156, lng: 72.6369, div: "GNR" },
  { name: "Bhuj", district: "Kutch", lat: 23.242, lng: 69.6669, div: "BHJ" },
  { name: "Mundra", district: "Kutch", lat: 22.839, lng: 69.725, div: "BHJ" },
];

const MANAGER_BY_DIV: Record<string, string> = {
  AMD: "manager@gov.in",
  SRT: "manager2@gov.in",
  VDR: "manager3@gov.in",
  RJK: "manager4@gov.in",
  GNR: "manager5@gov.in",
  BHJ: "manager6@gov.in",
};

const CONTRACTORS = [
  "Shree Ganesh Infra Pvt Ltd",
  "Patel Constructions",
  "Narmada Roadways",
  "Jay Ambe Builders",
  "Sardar Infra Projects",
  "Gujarat Construction Co",
];

// ---------------------------------------------------------------------------
// Asset definitions (creation order = index 1..70). Flags (overdue/upcoming/
// emergency/loop) are keyed by 1-based index below to keep this table compact.
// ---------------------------------------------------------------------------
type SpecObj = Record<string, string | number>;
interface AssetSeed {
  cat: string;
  name: string;
  div: string;
  status: AssetStatus;
  condition: Condition;
  roadNumber?: string;
  lengthKm?: number;
  builtYear?: number;
  lastRenovatedOn?: string;
  specs: SpecObj;
  cost: number; // rupees
}

const S = AssetStatus;
const C = Condition;

const ASSETS: AssetSeed[] = [
  // ---- State Highway (SH) x10 ----
  { cat: "SH", name: "SH-1 Ahmedabad–Mehsana Section (km 12–38)", div: "AMD", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "SH-1", lengthKm: 26, builtYear: 2016, specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 12, chainageToKm: 38 }, cost: 780000000 },
  { cat: "SH", name: "SH-19 Sarkhej–Sanand Section", div: "AMD", status: S.UNDER_MAINTENANCE, condition: C.FAIR, roadNumber: "SH-19", lengthKm: 18, builtYear: 2012, lastRenovatedOn: "2021-03-10", specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 0, chainageToKm: 18 }, cost: 540000000 },
  { cat: "SH", name: "SH-41 Surat–Kadodara Section", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "SH-41", lengthKm: 22, builtYear: 2018, specs: { surface: "Concrete", lanes: 6, widthM: 21, chainageFromKm: 0, chainageToKm: 22 }, cost: 960000000 },
  { cat: "SH", name: "SH-6 Surat–Bardoli Section", div: "SRT", status: S.UNDER_MAINTENANCE, condition: C.CRITICAL, roadNumber: "SH-6", lengthKm: 30, builtYear: 2009, lastRenovatedOn: "2020-05-18", specs: { surface: "Bituminous", lanes: 2, widthM: 10, chainageFromKm: 0, chainageToKm: 30 }, cost: 420000000 },
  { cat: "SH", name: "SH-11 Vadodara–Halol Section", div: "VDR", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "SH-11", lengthKm: 34, builtYear: 2015, specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 0, chainageToKm: 34 }, cost: 880000000 },
  { cat: "SH", name: "SH-25 Rajkot–Jamnagar Section", div: "RJK", status: S.IN_SERVICE, condition: C.FAIR, roadNumber: "SH-25", lengthKm: 40, builtYear: 2011, specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 0, chainageToKm: 40 }, cost: 1020000000 },
  { cat: "SH", name: "SH-7 Gandhinagar–Kalol Section", div: "GNR", status: S.IN_SERVICE, condition: C.EXCELLENT, roadNumber: "SH-7", lengthKm: 15, builtYear: 2019, specs: { surface: "Concrete", lanes: 4, widthM: 14, chainageFromKm: 0, chainageToKm: 15 }, cost: 600000000 },
  { cat: "SH", name: "SH-42 Bhuj–Mandvi Section", div: "BHJ", status: S.DECOMMISSIONED, condition: C.POOR, roadNumber: "SH-42", lengthKm: 28, builtYear: 1996, specs: { surface: "Bituminous", lanes: 2, widthM: 10, chainageFromKm: 0, chainageToKm: 28 }, cost: 320000000 },
  { cat: "SH", name: "SH-1 Extension, Mehsana Approach", div: "AMD", status: S.PROCURED, condition: C.GOOD, roadNumber: "SH-1", lengthKm: 12, specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 38, chainageToKm: 50 }, cost: 400000000 },
  { cat: "SH", name: "SH-27 Rajkot–Gondal Section", div: "RJK", status: S.PLANNED, condition: C.GOOD, roadNumber: "SH-27", lengthKm: 20, specs: { surface: "Bituminous", lanes: 4, widthM: 14, chainageFromKm: 0, chainageToKm: 20 }, cost: 550000000 },

  // ---- District Road (DR) x10 ----
  { cat: "DR", name: "MDR-24 Bardoli–Mandvi Road", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "MDR-24", lengthKm: 31, builtYear: 2017, specs: { surface: "Bituminous", lanes: 2, widthM: 7.5, chainageFromKm: 0, chainageToKm: 31 }, cost: 220000000 },
  { cat: "DR", name: "MDR-12 Sanand–Bavla Road", div: "AMD", status: S.IN_SERVICE, condition: C.FAIR, roadNumber: "MDR-12", lengthKm: 17, builtYear: 2013, specs: { surface: "Bituminous", lanes: 2, widthM: 7, chainageFromKm: 0, chainageToKm: 17 }, cost: 140000000 },
  { cat: "DR", name: "MDR-8 Ahmedabad Ring Connector", div: "AMD", status: S.IN_SERVICE, condition: C.EXCELLENT, roadNumber: "MDR-8", lengthKm: 9, builtYear: 2020, specs: { surface: "Concrete", lanes: 4, widthM: 12, chainageFromKm: 0, chainageToKm: 9 }, cost: 280000000 },
  { cat: "DR", name: "MDR-33 Vadodara–Padra Road", div: "VDR", status: S.UNDER_MAINTENANCE, condition: C.POOR, roadNumber: "MDR-33", lengthKm: 24, builtYear: 2008, specs: { surface: "Bituminous", lanes: 2, widthM: 7, chainageFromKm: 0, chainageToKm: 24 }, cost: 160000000 },
  { cat: "DR", name: "MDR-19 Rajkot–Jetpur Road", div: "RJK", status: S.IN_SERVICE, condition: C.FAIR, roadNumber: "MDR-19", lengthKm: 27, builtYear: 2012, specs: { surface: "Bituminous", lanes: 2, widthM: 7.5, chainageFromKm: 0, chainageToKm: 27 }, cost: 180000000 },
  { cat: "DR", name: "MDR-5 Gandhinagar–Mansa Road", div: "GNR", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "MDR-5", lengthKm: 21, builtYear: 2016, specs: { surface: "Bituminous", lanes: 2, widthM: 7, chainageFromKm: 0, chainageToKm: 21 }, cost: 150000000 },
  { cat: "DR", name: "MDR-44 Bhuj–Bhachau Road", div: "BHJ", status: S.UNDER_MAINTENANCE, condition: C.FAIR, roadNumber: "MDR-44", lengthKm: 35, builtYear: 2010, specs: { surface: "Bituminous", lanes: 2, widthM: 7, chainageFromKm: 0, chainageToKm: 35 }, cost: 200000000 },
  { cat: "DR", name: "MDR-27 Surat–Olpad Road", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "MDR-27", lengthKm: 19, builtYear: 2019, specs: { surface: "Concrete", lanes: 2, widthM: 7.5, chainageFromKm: 0, chainageToKm: 19 }, cost: 240000000 },
  { cat: "DR", name: "MDR-14 Dholka Link Road", div: "AMD", status: S.PROCURED, condition: C.GOOD, roadNumber: "MDR-14", lengthKm: 13, specs: { surface: "Bituminous", lanes: 2, widthM: 7, chainageFromKm: 0, chainageToKm: 13 }, cost: 120000000 },
  { cat: "DR", name: "MDR-9 Kalol–Chhatral Road", div: "GNR", status: S.DECOMMISSIONED, condition: C.POOR, roadNumber: "MDR-9", lengthKm: 11, builtYear: 1998, specs: { surface: "WBM", lanes: 2, widthM: 6, chainageFromKm: 0, chainageToKm: 11 }, cost: 60000000 },

  // ---- Village Road (VR) x6 ----
  { cat: "VR", name: "Sanand–Kalana Village Link Road", div: "AMD", status: S.IN_SERVICE, condition: C.FAIR, roadNumber: "VR-108", lengthKm: 6.5, builtYear: 2015, specs: { surface: "WBM", lanes: 2, widthM: 5, chainageFromKm: 0, chainageToKm: 6.5 }, cost: 35000000 },
  { cat: "VR", name: "Bardoli–Ten Village Road", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, roadNumber: "VR-212", lengthKm: 8, builtYear: 2018, specs: { surface: "Bituminous", lanes: 2, widthM: 5.5, chainageFromKm: 0, chainageToKm: 8 }, cost: 42000000 },
  { cat: "VR", name: "Bavla–Ranpur Village Road", div: "AMD", status: S.DECOMMISSIONED, condition: C.POOR, roadNumber: "VR-77", lengthKm: 12, builtYear: 2007, specs: { surface: "Earthen", lanes: 1, widthM: 4, chainageFromKm: 0, chainageToKm: 12 }, cost: 24000000 },
  { cat: "VR", name: "Gondal–Vasavad Village Road", div: "RJK", status: S.IN_SERVICE, condition: C.FAIR, roadNumber: "VR-145", lengthKm: 9.5, builtYear: 2013, specs: { surface: "WBM", lanes: 2, widthM: 5, chainageFromKm: 0, chainageToKm: 9.5 }, cost: 31000000 },
  { cat: "VR", name: "Anjar–Ratnal Village Road", div: "BHJ", status: S.UNDER_MAINTENANCE, condition: C.POOR, roadNumber: "VR-301", lengthKm: 7, builtYear: 2009, specs: { surface: "Earthen", lanes: 1, widthM: 4, chainageFromKm: 0, chainageToKm: 7 }, cost: 20000000 },
  { cat: "VR", name: "Mansa–Delvada Village Road", div: "GNR", status: S.PLANNED, condition: C.GOOD, roadNumber: "VR-56", lengthKm: 5.5, specs: { surface: "WBM", lanes: 2, widthM: 5, chainageFromKm: 0, chainageToKm: 5.5 }, cost: 38000000 },

  // ---- Bridge (BR) x10 ----
  { cat: "BR", name: "Sabarmati River Bridge, Ahmedabad", div: "AMD", status: S.IN_SERVICE, condition: C.GOOD, lengthKm: 0.42, builtYear: 2005, specs: { bridgeType: "PSC", spans: 12, loadClassMT: 70, crossing: "Sabarmati River" }, cost: 1450000000 },
  { cat: "BR", name: "Tapi Bridge, Surat", div: "SRT", status: S.IN_SERVICE, condition: C.FAIR, lengthKm: 0.68, builtYear: 2001, specs: { bridgeType: "PSC", spans: 16, loadClassMT: 70, crossing: "Tapi River" }, cost: 1680000000 },
  { cat: "BR", name: "Mahi River Bridge, Vadodara", div: "VDR", status: S.IN_SERVICE, condition: C.GOOD, lengthKm: 0.55, builtYear: 2010, specs: { bridgeType: "RCC", spans: 10, loadClassMT: 70, crossing: "Mahi River" }, cost: 1320000000 },
  { cat: "BR", name: "Old Narmada Bridge, Bharuch Approach", div: "VDR", status: S.UNDER_MAINTENANCE, condition: C.CRITICAL, lengthKm: 0.75, builtYear: 1978, lastRenovatedOn: "2016-11-02", specs: { bridgeType: "Steel", spans: 14, loadClassMT: 40, crossing: "Narmada River" }, cost: 900000000 },
  { cat: "BR", name: "Bhadar River Bridge, Rajkot", div: "RJK", status: S.IN_SERVICE, condition: C.FAIR, lengthKm: 0.3, builtYear: 2008, specs: { bridgeType: "RCC", spans: 8, loadClassMT: 55, crossing: "Bhadar River" }, cost: 600000000 },
  { cat: "BR", name: "Rukmavati Bridge, Bhuj", div: "BHJ", status: S.IN_SERVICE, condition: C.GOOD, lengthKm: 0.22, builtYear: 2012, specs: { bridgeType: "RCC", spans: 6, loadClassMT: 55, crossing: "Rukmavati River" }, cost: 450000000 },
  { cat: "BR", name: "Khari River Bridge, Gandhinagar", div: "GNR", status: S.PROCURED, condition: C.GOOD, lengthKm: 0.18, specs: { bridgeType: "RCC", spans: 6, loadClassMT: 70, crossing: "Khari River" }, cost: 520000000 },
  { cat: "BR", name: "Mindhola Bridge, Surat", div: "SRT", status: S.UNDER_MAINTENANCE, condition: C.FAIR, lengthKm: 0.35, builtYear: 2007, specs: { bridgeType: "PSC", spans: 9, loadClassMT: 70, crossing: "Mindhola River" }, cost: 720000000 },
  { cat: "BR", name: "Sabarmati Bridge Extension, Riverfront", div: "AMD", status: S.IN_SERVICE, condition: C.EXCELLENT, lengthKm: 0.4, builtYear: 2022, specs: { bridgeType: "PSC", spans: 10, loadClassMT: 70, crossing: "Sabarmati River" }, cost: 1100000000 },
  { cat: "BR", name: "Kankavati Bridge, Kutch", div: "BHJ", status: S.DECOMMISSIONED, condition: C.CRITICAL, lengthKm: 0.28, builtYear: 1985, specs: { bridgeType: "Masonry", spans: 5, loadClassMT: 25, crossing: "Kankavati River" }, cost: 180000000 },

  // ---- Culvert (CV) x6 ----
  { cat: "CV", name: "Culvert at SH-1 km 21, Sanand", div: "AMD", status: S.IN_SERVICE, condition: C.GOOD, specs: { culvertType: "Box", spans: 2, widthM: 6 }, cost: 4500000 },
  { cat: "CV", name: "Culvert at MDR-24 km 8, Bardoli", div: "SRT", status: S.IN_SERVICE, condition: C.FAIR, specs: { culvertType: "Pipe", spans: 1, widthM: 4 }, cost: 1800000 },
  { cat: "CV", name: "Culvert at SH-11 km 15, Halol", div: "VDR", status: S.IN_SERVICE, condition: C.GOOD, specs: { culvertType: "Slab", spans: 3, widthM: 7 }, cost: 6000000 },
  { cat: "CV", name: "Culvert at MDR-19 km 12, Jetpur", div: "RJK", status: S.UNDER_MAINTENANCE, condition: C.POOR, specs: { culvertType: "Pipe", spans: 2, widthM: 5 }, cost: 2200000 },
  { cat: "CV", name: "Culvert at SH-42 km 9, Mandvi", div: "BHJ", status: S.IN_SERVICE, condition: C.FAIR, specs: { culvertType: "Box", spans: 2, widthM: 6 }, cost: 3800000 },
  { cat: "CV", name: "Culvert at MDR-5 km 6, Mansa", div: "GNR", status: S.IN_SERVICE, condition: C.GOOD, specs: { culvertType: "Slab", spans: 2, widthM: 6 }, cost: 4200000 },

  // ---- Government Building (BL) x10 ----
  { cat: "BL", name: "R&B Division Office, Rajkot", div: "RJK", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2004, specs: { floors: 3, builtUpAreaSqM: 2400, usage: "Office" }, cost: 85000000 },
  { cat: "BL", name: "R&B Circle Office, Ahmedabad", div: "AMD", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2000, lastRenovatedOn: "2019-07-20", specs: { floors: 5, builtUpAreaSqM: 5200, usage: "Office" }, cost: 180000000 },
  { cat: "BL", name: "R&B Rest House, Gandhinagar", div: "GNR", status: S.DECOMMISSIONED, condition: C.POOR, builtYear: 1995, specs: { floors: 2, builtUpAreaSqM: 1200, usage: "Rest House" }, cost: 42000000 },
  { cat: "BL", name: "R&B Sub-division Office, Surat", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2009, specs: { floors: 3, builtUpAreaSqM: 2100, usage: "Office" }, cost: 78000000 },
  { cat: "BL", name: "R&B Stores Depot, Vadodara", div: "VDR", status: S.UNDER_MAINTENANCE, condition: C.FAIR, builtYear: 1998, specs: { floors: 1, builtUpAreaSqM: 3000, usage: "Store" }, cost: 55000000 },
  { cat: "BL", name: "R&B Rest House, Bhuj", div: "BHJ", status: S.PLANNED, condition: C.GOOD, specs: { floors: 2, builtUpAreaSqM: 1400, usage: "Rest House" }, cost: 61000000 },
  { cat: "BL", name: "R&B Division Office, Surat", div: "SRT", status: S.IN_SERVICE, condition: C.EXCELLENT, builtYear: 2006, specs: { floors: 4, builtUpAreaSqM: 3600, usage: "Office" }, cost: 120000000 },
  { cat: "BL", name: "R&B Old Records Building, Ahmedabad", div: "AMD", status: S.DECOMMISSIONED, condition: C.POOR, builtYear: 1975, specs: { floors: 2, builtUpAreaSqM: 900, usage: "Store" }, cost: 21000000 },
  { cat: "BL", name: "R&B Guest House, Rajkot", div: "RJK", status: S.UNDER_MAINTENANCE, condition: C.POOR, builtYear: 1990, specs: { floors: 2, builtUpAreaSqM: 1600, usage: "Rest House" }, cost: 38000000 },
  { cat: "BL", name: "R&B Administrative Block, Vadodara", div: "VDR", status: S.PLANNED, condition: C.GOOD, specs: { floors: 6, builtUpAreaSqM: 7000, usage: "Office" }, cost: 240000000 },

  // ---- Residential Quarters (RQ) x6 ----
  { cat: "RQ", name: "Government Quarters Block C, Sector 11 Gandhinagar", div: "GNR", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2008, specs: { floors: 4, builtUpAreaSqM: 3200, usage: "Residential" }, cost: 95000000 },
  { cat: "RQ", name: "Engineer Quarters, Ahmedabad", div: "AMD", status: S.IN_SERVICE, condition: C.FAIR, builtYear: 2002, specs: { floors: 3, builtUpAreaSqM: 2800, usage: "Residential" }, cost: 72000000 },
  { cat: "RQ", name: "Staff Quarters Block A, Surat", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2011, specs: { floors: 5, builtUpAreaSqM: 4200, usage: "Residential" }, cost: 110000000 },
  { cat: "RQ", name: "Staff Quarters, Rajkot", div: "RJK", status: S.DECOMMISSIONED, condition: C.POOR, builtYear: 1999, specs: { floors: 3, builtUpAreaSqM: 2400, usage: "Residential" }, cost: 54000000 },
  { cat: "RQ", name: "Officer Quarters, Vadodara", div: "VDR", status: S.DISPOSED, condition: C.POOR, builtYear: 1980, specs: { floors: 2, builtUpAreaSqM: 1800, usage: "Residential" }, cost: 30000000 },
  { cat: "RQ", name: "Staff Quarters Block B, Bhuj", div: "BHJ", status: S.PROCURED, condition: C.GOOD, specs: { floors: 4, builtUpAreaSqM: 3600, usage: "Residential" }, cost: 100000000 },

  // ---- Machinery (MC) x12 ----
  { cat: "MC", name: "Road Roller GJ-03-AB-4412", div: "AMD", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2019, specs: { make: "BOMAG", model: "BW 219", regNo: "GJ-03-AB-4412", yearOfManufacture: 2019, engineHours: 4200 }, cost: 6500000 },
  { cat: "MC", name: "Motor Grader GJ-05-CD-2231", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2020, specs: { make: "CAT", model: "120K", regNo: "GJ-05-CD-2231", yearOfManufacture: 2020, engineHours: 3100 }, cost: 10500000 },
  { cat: "MC", name: "Bitumen Paver GJ-01-EF-7788", div: "AMD", status: S.IN_SERVICE, condition: C.FAIR, builtYear: 2017, specs: { make: "Apollo", model: "AP 550", regNo: "GJ-01-EF-7788", yearOfManufacture: 2017, engineHours: 5600 }, cost: 8800000 },
  { cat: "MC", name: "Tipper Truck GJ-18-GH-1290", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2021, specs: { make: "Tata", model: "LPK 2518", regNo: "GJ-18-GH-1290", yearOfManufacture: 2021, engineHours: 2200 }, cost: 3200000 },
  { cat: "MC", name: "Road Roller GJ-06-IJ-5510", div: "RJK", status: S.IN_SERVICE, condition: C.FAIR, builtYear: 2016, specs: { make: "JCB", model: "VMT 330", regNo: "GJ-06-IJ-5510", yearOfManufacture: 2016, engineHours: 6100 }, cost: 5800000 },
  { cat: "MC", name: "Hydraulic Excavator GJ-02-KL-3345", div: "VDR", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2019, specs: { make: "Hyundai", model: "R220", regNo: "GJ-02-KL-3345", yearOfManufacture: 2019, engineHours: 4800 }, cost: 9200000 },
  { cat: "MC", name: "Motor Grader GJ-12-MN-6620", div: "GNR", status: S.IN_SERVICE, condition: C.FAIR, builtYear: 2015, specs: { make: "CAT", model: "140K", regNo: "GJ-12-MN-6620", yearOfManufacture: 2015, engineHours: 7200 }, cost: 11000000 },
  { cat: "MC", name: "Tipper Truck GJ-04-OP-8834", div: "BHJ", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2020, specs: { make: "Ashok Leyland", model: "2518", regNo: "GJ-04-OP-8834", yearOfManufacture: 2020, engineHours: 2600 }, cost: 3000000 },
  { cat: "MC", name: "Bitumen Sprayer GJ-03-QR-1177", div: "AMD", status: S.UNDER_MAINTENANCE, condition: C.POOR, builtYear: 2014, specs: { make: "Apollo", model: "BS 200", regNo: "GJ-03-QR-1177", yearOfManufacture: 2014, engineHours: 8100 }, cost: 2400000 },
  { cat: "MC", name: "Concrete Mixer GJ-18-ST-4455", div: "SRT", status: S.IN_SERVICE, condition: C.GOOD, builtYear: 2018, specs: { make: "Schwing", model: "SP 305", regNo: "GJ-18-ST-4455", yearOfManufacture: 2018, engineHours: 3900 }, cost: 4000000 },
  { cat: "MC", name: "Road Roller GJ-06-UV-9902", div: "RJK", status: S.DECOMMISSIONED, condition: C.CRITICAL, builtYear: 2008, specs: { make: "BOMAG", model: "BW 211", regNo: "GJ-06-UV-9902", yearOfManufacture: 2008, engineHours: 15200 }, cost: 1200000 },
  { cat: "MC", name: "Vibratory Roller GJ-12-WX-3388", div: "GNR", status: S.DISPOSED, condition: C.CRITICAL, builtYear: 2005, specs: { make: "JCB", model: "VM 115", regNo: "GJ-12-WX-3388", yearOfManufacture: 2005, engineHours: 19800 }, cost: 800000 },
];

// Flags keyed by 1-based index into ASSETS.
const OVERDUE = new Set([2, 11, 14, 30, 40, 46, 61, 65, 67, 51]);
const UPCOMING = new Set([1, 12, 16, 18, 22, 27, 31, 42, 44, 54, 59, 63]);
const EMERGENCY = new Set([2, 4, 14, 25, 30, 40, 51, 67]);
const LOOP = new Set([1, 3, 27, 28]);

// ---------------------------------------------------------------------------
// Lifecycle path + remarks
// ---------------------------------------------------------------------------
function pathFor(status: AssetStatus, loop: boolean): AssetStatus[] {
  switch (status) {
    case S.PLANNED:
      return [S.PLANNED];
    case S.PROCURED:
      return [S.PLANNED, S.PROCURED];
    case S.IN_SERVICE:
      return loop
        ? [S.PLANNED, S.PROCURED, S.IN_SERVICE, S.UNDER_MAINTENANCE, S.IN_SERVICE, S.UNDER_MAINTENANCE, S.IN_SERVICE]
        : [S.PLANNED, S.PROCURED, S.IN_SERVICE];
    case S.UNDER_MAINTENANCE:
      return [S.PLANNED, S.PROCURED, S.IN_SERVICE, S.UNDER_MAINTENANCE];
    case S.DECOMMISSIONED:
      return [S.PLANNED, S.PROCURED, S.IN_SERVICE, S.DECOMMISSIONED];
    case S.DISPOSED:
      return [S.PLANNED, S.PROCURED, S.IN_SERVICE, S.DECOMMISSIONED, S.DISPOSED];
    default:
      return [S.PLANNED];
  }
}

function remarkFor(from: AssetStatus | null, to: AssetStatus): string {
  if (to === S.PLANNED) return "Project sanctioned and planned";
  if (to === S.PROCURED) return "Work order issued to contractor";
  if (to === S.IN_SERVICE && from === S.PROCURED)
    return "Handed over after final inspection";
  if (to === S.IN_SERVICE && from === S.UNDER_MAINTENANCE)
    return "Resurfacing completed, reopened to traffic";
  if (to === S.UNDER_MAINTENANCE)
    return "Monsoon damage – closed for repair";
  if (to === S.DECOMMISSIONED)
    return "Beyond economic repair – condemned";
  if (to === S.DISPOSED) return "Disposed and struck off inventory";
  return "Status updated";
}

/** Days-ago anchor for when the current status was reached. */
function finalDaysAgo(status: AssetStatus, loop: boolean): number {
  switch (status) {
    case S.PLANNED:
      return randInt(600, 800);
    case S.PROCURED:
      return randInt(400, 600);
    case S.IN_SERVICE:
      return loop ? randInt(90, 200) : randInt(250, 500);
    case S.UNDER_MAINTENANCE:
      return randInt(20, 90);
    case S.DECOMMISSIONED:
      return randInt(250, 450);
    case S.DISPOSED:
      return randInt(120, 300);
    default:
      return 400;
  }
}

// ---------------------------------------------------------------------------
// Maintenance generation
// ---------------------------------------------------------------------------
type MaintProfile = "overdue" | "upcoming" | "future" | "past";

function costForType(type: MaintenanceType, categoryCode: string): number {
  const road = ["SH", "DR", "VR"].includes(categoryCode);
  const bridge = categoryCode === "BR";
  const heavy = road || bridge;
  switch (type) {
    case MaintenanceType.ROUTINE:
      return randInt(5000, 200000);
    case MaintenanceType.INSPECTION:
      return randInt(10000, 150000);
    case MaintenanceType.PERIODIC_RENEWAL:
      return heavy ? randInt(2000000, 25000000) : randInt(200000, 3000000);
    case MaintenanceType.RESURFACING:
      return heavy ? randInt(5000000, 90000000) : randInt(500000, 5000000);
    case MaintenanceType.STRUCTURAL_REPAIR:
      return heavy ? randInt(3000000, 60000000) : randInt(400000, 6000000);
    case MaintenanceType.EMERGENCY:
      return heavy ? randInt(1000000, 25000000) : randInt(200000, 4000000);
    default:
      return randInt(10000, 500000);
  }
}

function workOrderNo(divCode: string): string {
  return `RNB/${divCode}/2025-26/${String(randInt(1, 9999)).padStart(4, "0")}`;
}

interface MaintInput {
  type: MaintenanceType;
  description: string;
  cost: number;
  contractor: string;
  workOrderNo: string;
  performedOn: Date;
  nextDueOn: Date | null;
}

function buildMaintenance(
  asset: AssetSeed,
  profile: MaintProfile,
  emergency: boolean
): MaintInput[] {
  const recs: MaintInput[] = [];
  const desc: Record<string, string> = {
    ROUTINE: "Routine upkeep – pothole patching and shoulder dressing",
    PERIODIC_RENEWAL: "Periodic renewal coat applied",
    RESURFACING: "Full-width resurfacing / overlay",
    STRUCTURAL_REPAIR: "Structural repair of damaged members",
    EMERGENCY: "Emergency repair after monsoon damage",
    INSPECTION: "Scheduled condition inspection",
  };

  const make = (
    type: MaintenanceType,
    performedOn: Date,
    nextDueOn: Date | null
  ): MaintInput => ({
    type,
    description: desc[type],
    cost: costForType(type, asset.cat),
    contractor: pick(CONTRACTORS),
    workOrderNo: workOrderNo(asset.div),
    performedOn,
    nextDueOn,
  });

  // Older supporting records (0–2), always well before the latest one.
  const older = randInt(0, 2);
  for (let k = older; k >= 1; k--) {
    const performedOn = daysAgo(120 + k * 130 + randInt(0, 40));
    const type = pick([
      MaintenanceType.ROUTINE,
      MaintenanceType.INSPECTION,
      MaintenanceType.PERIODIC_RENEWAL,
    ]);
    recs.push(make(type, performedOn, daysAgo(120 + k * 130 - 100)));
  }

  // Emergency record (monsoon-clustered), older than the latest record.
  if (emergency) {
    recs.push(
      make(MaintenanceType.EMERGENCY, lastMonsoon(), daysAgo(randInt(20, 80)))
    );
  }

  // Latest record: performed recently; nextDueOn drives overdue/upcoming/future.
  const latestPerformedOn = daysAgo(randInt(15, 70));
  let nextDueOn: Date | null;
  let latestType: MaintenanceType;
  if (profile === "overdue") {
    nextDueOn = daysAgo(randInt(5, 60));
    latestType = pick([
      MaintenanceType.PERIODIC_RENEWAL,
      MaintenanceType.RESURFACING,
      MaintenanceType.STRUCTURAL_REPAIR,
    ]);
  } else if (profile === "upcoming") {
    nextDueOn = daysFromNow(randInt(3, 28));
    latestType = pick([MaintenanceType.ROUTINE, MaintenanceType.INSPECTION]);
  } else if (profile === "future") {
    nextDueOn = daysFromNow(randInt(60, 330));
    latestType = pick([
      MaintenanceType.ROUTINE,
      MaintenanceType.PERIODIC_RENEWAL,
      MaintenanceType.INSPECTION,
    ]);
  } else {
    // past / decommissioned – no future due date.
    nextDueOn = null;
    latestType = MaintenanceType.INSPECTION;
  }
  recs.push(make(latestType, latestPerformedOn, nextDueOn));

  return recs;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding R&B Asset Management demo data...");

  // 1. Wipe transactional data (idempotent). Cascades cover history/maintenance
  //    on asset delete, but we clear explicitly for clarity.
  await prisma.maintenanceRecord.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.asset.deleteMany();

  // 2. Upsert divisions.
  const divisionByCode = new Map<string, string>();
  for (const d of DIVISIONS) {
    const rec = await prisma.division.upsert({
      where: { code: d.code },
      update: { name: d.name, circle: d.circle },
      create: d,
    });
    divisionByCode.set(d.code, rec.id);
  }

  // 3. Upsert users (bcrypt cost 10).
  const userByEmail = new Map<string, string>();
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const divisionId = u.div ? divisionByCode.get(u.div)! : null;
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hash, role: u.role, divisionId, isActive: true },
      create: { name: u.name, email: u.email, password: hash, role: u.role, divisionId },
    });
    userByEmail.set(u.email, rec.id);
  }

  // 4. Upsert categories.
  const categoryByCode = new Map<string, string>();
  for (const c of CATEGORIES) {
    const rec = await prisma.category.upsert({
      where: { code: c.code },
      update: { name: c.name, usefulLifeYears: c.usefulLifeYears },
      create: c,
    });
    categoryByCode.set(c.code, rec.id);
  }

  // 5. Ensure locations (no natural unique key -> find-or-create).
  const locationsByDiv = new Map<string, string[]>();
  for (const l of LOCATIONS) {
    let rec = await prisma.location.findFirst({
      where: { name: l.name, district: l.district },
    });
    if (!rec) {
      rec = await prisma.location.create({
        data: { name: l.name, district: l.district, lat: l.lat, lng: l.lng },
      });
    }
    const arr = locationsByDiv.get(l.div) ?? [];
    arr.push(rec.id);
    locationsByDiv.set(l.div, arr);
  }

  const managerId = (divCode: string) =>
    userByEmail.get(MANAGER_BY_DIV[divCode])!;

  // 6. Create assets with history + maintenance.
  let assetCount = 0;
  let historyCount = 0;
  let maintenanceCount = 0;

  for (let i = 0; i < ASSETS.length; i++) {
    const a = ASSETS[i];
    const idx = i + 1;
    const divisionId = divisionByCode.get(a.div)!;
    const categoryId = categoryByCode.get(a.cat)!;
    const locs = locationsByDiv.get(a.div)!;
    const locationId = locs[idx % locs.length];
    const creator = managerId(a.div);

    const assetCode = await generateAssetCode(prisma, a.cat);
    const loop = LOOP.has(idx);

    const acquisitionDate = a.builtYear
      ? new Date(a.builtYear, 0, 15)
      : null;

    const asset = await prisma.asset.create({
      data: {
        assetCode,
        name: a.name,
        categoryId,
        divisionId,
        locationId,
        status: a.status,
        condition: a.condition,
        roadNumber: a.roadNumber ?? null,
        lengthKm: a.lengthKm ?? null,
        builtYear: a.builtYear ?? null,
        lastRenovatedOn: a.lastRenovatedOn ? new Date(a.lastRenovatedOn) : null,
        specs: a.specs as Prisma.InputJsonValue,
        acquisitionDate,
        acquisitionCost: new Prisma.Decimal(a.cost),
        createdById: creator,
      },
    });
    assetCount++;

    // Status history: valid path with increasing dates, first row fromStatus=null.
    const path = pathFor(a.status, loop);
    const anchor = finalDaysAgo(a.status, loop);
    const gap = 150;
    for (let step = 0; step < path.length; step++) {
      const from = step === 0 ? null : path[step - 1];
      const to = path[step];
      const changedAt = daysAgo(anchor + (path.length - 1 - step) * gap);
      await prisma.statusHistory.create({
        data: {
          assetId: asset.id,
          fromStatus: from,
          toStatus: to,
          remarks: remarkFor(from, to),
          changedById: creator,
          changedAt,
        },
      });
      historyCount++;
    }

    // Maintenance: only for IN_SERVICE / UNDER_MAINTENANCE / DECOMMISSIONED.
    const counted =
      a.status === S.IN_SERVICE ||
      a.status === S.UNDER_MAINTENANCE ||
      a.status === S.DECOMMISSIONED;
    if (counted) {
      let profile: MaintProfile;
      if (a.status === S.DECOMMISSIONED) profile = "past";
      else if (OVERDUE.has(idx)) profile = "overdue";
      else if (UPCOMING.has(idx)) profile = "upcoming";
      else profile = "future";

      const records = buildMaintenance(a, profile, EMERGENCY.has(idx));
      for (const r of records) {
        await prisma.maintenanceRecord.create({
          data: {
            assetId: asset.id,
            type: r.type,
            description: r.description,
            cost: new Prisma.Decimal(r.cost),
            contractor: r.contractor,
            workOrderNo: r.workOrderNo,
            performedOn: r.performedOn,
            nextDueOn: r.nextDueOn,
            performedById: creator,
          },
        });
        maintenanceCount++;
      }
    }
  }

  console.log(
    `Seed complete: ${DIVISIONS.length} divisions, ${USERS.length} users, ` +
      `${CATEGORIES.length} categories, ${assetCount} assets, ` +
      `${historyCount} status-history rows, ${maintenanceCount} maintenance records.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
