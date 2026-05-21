import { expectType } from "./utilities";

// -- Fun.cron() --

// 5-field expressions
Fun.cron("./worker.ts", "* * * * *", "all-stars");
Fun.cron("./worker.ts", "30 2 * * 1", "weekly-report");
Fun.cron("./worker.ts", "0 0 1 1 *", "new-year");
Fun.cron("./worker.ts", "*/15 * * * *", "every-15-min");
Fun.cron("./worker.ts", "0 9 * * 1-5", "weekday-morning");
Fun.cron("./worker.ts", "0 0 1-15/2 1-3 *", "biweekly-q1");
Fun.cron("./worker.ts", "0,15,30,45 * * * *", "quarter-hours");
Fun.cron("./worker.ts", "30 2 * * MON", "weekly-named");
Fun.cron("./worker.ts", "0 0 * * MON-FRI", "weekday-range");
Fun.cron("./worker.ts", "0 0 * JAN-MAR *", "month-range");

// All nicknames
Fun.cron("./worker.ts", "@yearly", "yearly");
Fun.cron("./worker.ts", "@annually", "annually");
Fun.cron("./worker.ts", "@monthly", "monthly");
Fun.cron("./worker.ts", "@weekly", "weekly");
Fun.cron("./worker.ts", "@daily", "daily");
Fun.cron("./worker.ts", "@midnight", "midnight");
Fun.cron("./worker.ts", "@hourly", "hourly");

// -- Fun.cron.parse() --

expectType(Fun.cron.parse("* * * * *")).is<Date | null>();
expectType(Fun.cron.parse("@daily")).is<Date | null>();
expectType(Fun.cron.parse("30 9 * * MON-FRI")).is<Date | null>();
expectType(Fun.cron.parse("@hourly", new Date())).is<Date | null>();
expectType(Fun.cron.parse("@hourly", Date.now())).is<Date | null>();
expectType(Fun.cron.parse("0 0 1 1 *", Date.UTC(2025, 0, 1))).is<Date | null>();

// -- Fun.cron.remove() --

expectType(Fun.cron.remove("weekly-report")).is<Promise<void>>();

// -- Return type --

expectType(Fun.cron("./worker.ts", "@daily", "daily")).is<Promise<void>>();

// -- In-process callback overload --

expectType(Fun.cron("* * * * *", () => {})).is<Fun.CronJob>();
expectType(Fun.cron("@hourly", async () => {})).is<Fun.CronJob>();
expectType(Fun.cron("*/30 * * * *", () => fetch("http://x"))).is<Fun.CronJob>();
Fun.cron("* * * * *", function () {
  this.stop();
});
using job = Fun.cron("0 * * * *", () => {});
expectType(job.cron).is<string>();
expectType(job.stop()).is<Fun.CronJob>();
expectType(job.ref()).is<Fun.CronJob>();
expectType(job.unref()).is<Fun.CronJob>();
expectType(job[Symbol.dispose]()).is<void>();

// -- @ts-expect-error cases --

// @ts-expect-error - missing schedule and title
Fun.cron("./worker.ts");

// -- Cron type is accessible --

declare const schedule: Fun.CronWithAutocomplete;

// -- CronController type is accessible --

declare const controller: Fun.CronController;
expectType(controller.type).is<"scheduled">();
expectType(controller.cron).is<string>();
expectType(controller.scheduledTime).is<number>();
