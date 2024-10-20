#!/usr/bin/env node

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { intro, outro, select, spinner, text, note } from "@clack/prompts";
import minimist from "minimist";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const {
  t = undefined,
  s = undefined,
  e = undefined,
} = minimist(process.argv.slice(2));

const holidays = {
  "2024-12-24": "Christmas Eve",
  "2024-12-25": "Christmas Day",
  "2024-12-26": "Proclamation Day",
  "2024-12-31": "New Year's Eve",
  "2025-01-01": "New Year's Day",
  "2025-01-27": "Australia Day",
  "2025-03-10": "Adelaide Cup Day",
  "2025-04-18": "Good Friday",
  "2025-04-19": "Easter Saturday",
  "2025-04-20": "Easter Sunday",
  "2025-04-21": "Easter Monday",
  "2025-04-25": "ANZAC Day",
  "2025-06-09": "King’s Birthday",
  "2025-10-06": "Labour Day",
  "2025-12-24": "Christmas Eve",
  "2025-12-25": "Christmas Day",
  "2025-12-26": "Proclamation Day",
  "2025-12-31": "New Year's Eve",
  "2026-01-01": "New Year's Day",
  "2026-01-26": "Australia Day",
  "2026-03-09": "Adelaide Cup Day",
  "2026-04-03": "Good Friday",
  "2026-04-04": "Easter Saturday",
  "2026-04-05": "Easter Sunday",
  "2026-04-06": "Easter Monday",
  "2026-04-25": "ANZAC Day",
  "2026-06-08": "King’s Birthday",
  "2026-10-05": "Labour Day",
  "2026-12-24": "Christmas Eve",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Proclamation Day",
  "2026-12-31": "New Year's Eve",
};
const holidaysArr = Object.keys(holidays).map((day) =>
  dayjs(day).format("YYYY-MM-DD")
);

const isValidDate = (dateString) => {
  return dayjs(dateString, "YYYY-MM-DD", true).isValid();
};

const isValidEndDate = (start, end) => {
  return (
    isValidDate(end) &&
    !dayjs(end).isSame(dayjs(start)) &&
    dayjs(end).isAfter(dayjs(start))
  );
};

const createTogglEntry = async (current, end, config) => {
  if (current.isAfter(end)) {
    outro("All done!");

    return;
  }

  const day = current.day();
  const formattedDay = current.format("YYYY-MM-DD");

  const s = spinner();
  s.start(`Processing ${formattedDay}`);

  if (day === 0 || day === 6 || config.holidays.includes(formattedDay)) {
    s.stop(
      `⏭️  Skipping ${formattedDay} since its the ${
        day === 0 || day === 6 ? "weekend" : holidays[formattedDay]
      } `
    );
    return createTogglEntry(current.add(1, "day"), end, config);
  }

  fetch(`https://api.track.toggl.com/api/v9/time_entries`, {
    method: "POST",
    body: JSON.stringify({
      created_with: "toggl with wings",
      description: config.description,
      duration: 27360,
      pid: config.pid,
      wid: 8818825,
      start: current.set("hour", 9).set("minute", 0).utc().format(),
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${config.authString}`,
    },
  })
    .then(() => {
      s.stop(`✅ Recorded ${formattedDay}`);
      return createTogglEntry(current.add(1, "day"), end, config);
    })
    .catch((e) => {
      console.log(e);
      s.stop("Failed!");
    });
};

intro(
  `Toggl With Wings, helper for recording holiday entries` +
    "\r\n  _____                 _      \r\n |_   _|__   __ _  __ _| |     \r\n   | |/ _ \\ / _` |/ _` | |     \r\n   | | (_) | (_| | (_| | |     \r\n   |_|\\___/ \\__, |\\__, |_|     \r\n __        _|___/ |___/        \r\n \\ \\      / (_) |_| |__        \r\n  \\ \\ /\\ / /| | __| '_ \\       \r\n   \\ V  V / | | |_| | | |      \r\n __ \\_/\\_/ _|_|\\__|_| |_|      \r\n \\ \\      / (_)_ __   __ _ ___ \r\n  \\ \\ /\\ / /| | '_ \\ / _` / __|\r\n   \\ V  V / | | | | | (_| \\__ \\\r\n    \\_/\\_/  |_|_| |_|\\__, |___/\r\n                     |___/     \r\n" +
    `
    Options

      -t Toggl API Token
      -s Start date in YYYY-MM-DD format
      -e End date in YYYY-MM-DD format
    `
);

const api_token =
  t ??
  (await text({
    message:
      "What is your Toggl API key? Visit https://track.toggl.com/profile to get the key",
    validate(value) {
      if (value.length === 0) return `API Key is required!`;
    },
  }));

const authString = btoa(`${api_token}:api_token`);

const start = isValidDate(s)
  ? s
  : await text({
      message: "When does your holidays start? ",
      placeholder: "YYYY-MM-DD",
      initialValue: "2024-12-05",
      validate(value) {
        if (!isValidDate(value))
          return `Invalid date, needs to be in YYYY-MM-DD format.`;
      },
    });

const end = isValidEndDate(start, e)
  ? e
  : await text({
      message: "When does your holidays end? ",
      placeholder: "YYYY-MM-DD",
      initialValue: "2024-12-09",
      validate(value) {
        if (!isValidDate(value))
          return `Invalid date, needs to be in YYYY-MM-DD format.`;

        if (!isValidEndDate(start, value))
          return `End date should come after start date!`;
      },
    });

const leaveType = await select({
  message: "Pick leave type.",
  options: [
    { value: 206124728, label: "Annual Leave" },
    { value: 206124728, label: "Personal/Carer's Leave" },
  ],
});

const description = await text({
  message: "Add a description to the entries",
  initialValue: "ALG-78: on holiday",
  validate(value) {
    if (value.length === 0) return `Description can't be empty.`;
  },
});

await createTogglEntry(dayjs(start), dayjs(end), {
  holidays: holidaysArr,
  pid: Number(leaveType),
  authString,
  description,
});
