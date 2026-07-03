import * as t from "@tabler/icons-react";

const searches = [
  ["BookOpen",          /BookOpen|Book2/],
  ["BotMessageSquare",  /MessageRobot|RobotFace|RobotMessage/],
  ["CalendarRange",     /CalendarRange|CalendarWeek|CalendarStats/],
  ["Handshake",         /Handshake|Shake|Cooperation/],
  ["LayoutTemplate",    /LayoutTemplate|Template|LayoutBoard/],
  ["PackageMinus",      /PackageMinus|PackageOff/],
  ["PhoneMissed",       /PhoneMissed|PhoneEnd|PhoneOff/],
  ["RotateCcw",         /RotateCcw|RotateMinus|Rotate2/],
  ["Workflow",          /Workflow|FlowChart|TreeFlow/],
];

for (const [lucide, pat] of searches) {
  const found = Object.keys(t).filter(k => pat.test(k) && !k.includes("Filled")).slice(0, 6);
  console.log(`${lucide}: ${found.join(", ") || "NENHUM"}`);
}
