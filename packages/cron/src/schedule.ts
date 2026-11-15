export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type FieldSpec = { name: string; min: number; max: number };

const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day of week", min: 0, max: 7 },
];

type ParsedField = { any: boolean; values: Set<number> };

function parseNumber(text: string, spec: FieldSpec): number {
  if (!/^\d+$/.test(text)) throw new Error(`Invalid ${spec.name}: "${text}"`);
  const value = Number(text);
  if (value < spec.min || value > spec.max) {
    throw new Error(`${spec.name} out of range: ${value}`);
  }
  return value;
}

function parseField(text: string, spec: FieldSpec): ParsedField {
  const values = new Set<number>();
  for (const part of text.split(",")) {
    const [range, stepText, extra] = part.split("/");
    if (extra !== undefined) throw new Error(`Invalid ${spec.name}: "${part}"`);
    const step =
      stepText === undefined ? 1 : parseNumber(stepText, { ...spec, min: 1 });
    let from: number;
    let to: number;
    if (range === "*") {
      from = spec.min;
      to = spec.max;
    } else if (range.includes("-")) {
      const [first, last, more] = range.split("-");
      if (more !== undefined)
        throw new Error(`Invalid ${spec.name}: "${part}"`);
      from = parseNumber(first, spec);
      to = parseNumber(last, spec);
      if (from > to) throw new Error(`Invalid ${spec.name} range: "${part}"`);
    } else {
      from = parseNumber(range, spec);
      to = stepText === undefined ? from : spec.max;
    }
    for (let value = from; value <= to; value += step) values.add(value);
  }
  return { any: text === "*", values };
}

export type ParsedSchedule = ParsedField[];

export function parseSchedule(expression: string): ParsedSchedule {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== FIELDS.length) {
    throw new Error(
      `Cron needs 5 fields, got ${parts.length}: "${expression}"`,
    );
  }
  return parts.map((part, index) => parseField(part, FIELDS[index]));
}

type LocalTime = {
  minute: number;
  hour: number;
  day: number;
  month: number;
  weekday: number;
};

function localTime(at: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    minute: "numeric",
    hour: "numeric",
    day: "numeric",
    month: "numeric",
    weekday: "short",
  }).formatToParts(at);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    minute: Number(read("minute")),
    hour: Number(read("hour")),
    day: Number(read("day")),
    month: Number(read("month")),
    weekday: WEEKDAYS[read("weekday")],
  };
}

export function isDue(
  expression: string,
  at: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): boolean {
  const [minute, hour, day, month, weekday] = parseSchedule(expression);
  const now = localTime(at, timeZone);
  const weekdays = new Set([...weekday.values].map((value) => value % 7));
  const dayMatches = day.values.has(now.day);
  const weekdayMatches = weekdays.has(now.weekday);
  const dayRule =
    !day.any && !weekday.any
      ? dayMatches || weekdayMatches
      : dayMatches && weekdayMatches;
  return (
    minute.values.has(now.minute) &&
    hour.values.has(now.hour) &&
    month.values.has(now.month) &&
    dayRule
  );
}

export function floorToMinute(timestamp: number): number {
  return Math.floor(timestamp / 60_000) * 60_000;
}
