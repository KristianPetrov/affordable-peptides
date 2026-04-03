/** Pacific time (PST/PDT via IANA zone), aligned with order emails. */
const PACIFIC_TIMEZONE = "America/Los_Angeles";

export function formatDateTimePacific (input: string | number | Date): string
{
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
