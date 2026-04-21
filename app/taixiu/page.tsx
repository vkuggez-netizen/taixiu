"use client";

import { useMemo, useRef, useState } from "react";

type Choice = "tai" | "xiu";

type Round = {
  id: string;
  at: number;
  bet: number;
  choice: Choice;
  dice: [number, number, number];
  sum: number;
  result: Choice;
  profit: number; // +bet (win) or -bet (lose)
  balanceAfter: number;
};

const DEFAULT_BALANCE = 500_000;
const MIN_BET = 1_000;
const ROLL_MS = 900;
const PAYOUT_MULTIPLIER = 1.95; // total return on win (includes stake)

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function rollDie() {
  return (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

function sumChoice(sum: number): Choice {
  return sum >= 11 ? "tai" : "xiu";
}

function DiceSvg({ value }: { value: number }) {
  const pip = (cx: number, cy: number) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.2" fill="currentColor" />
  );

  const pips: Record<number, Array<[number, number]>> = {
    1: [[18, 18]],
    2: [
      [11, 11],
      [25, 25],
    ],
    3: [
      [11, 11],
      [18, 18],
      [25, 25],
    ],
    4: [
      [11, 11],
      [25, 11],
      [11, 25],
      [25, 25],
    ],
    5: [
      [11, 11],
      [25, 11],
      [18, 18],
      [11, 25],
      [25, 25],
    ],
    6: [
      [11, 11],
      [25, 11],
      [11, 18],
      [25, 18],
      [11, 25],
      [25, 25],
    ],
  };

  const safe = clampInt(value, 1, 6);
  return (
    <svg
      width="46"
      height="46"
      viewBox="0 0 36 36"
      role="img"
      aria-label={`Dice ${safe}`}
      className="text-zinc-900 dark:text-white"
    >
      <defs>
        <linearGradient id="diceFill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.98)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.70)" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="30"
        height="30"
        rx="8"
        fill="url(#diceFill)"
        className="dark:fill-white/10"
      />
      <rect
        x="3"
        y="3"
        width="30"
        height="30"
        rx="8"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        className="dark:stroke-white/15"
      />
      {pips[safe].map(([cx, cy]) => pip(cx, cy))}
    </svg>
  );
}

export default function TaiXiuPage() {
  const [balance, setBalance] = useState<number>(DEFAULT_BALANCE);
  const [betText, setBetText] = useState<string>("10000");
  const [choice, setChoice] = useState<Choice>("tai");
  const [history, setHistory] = useState<Round[]>([]);
  const [lastRound, setLastRound] = useState<Round | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number, number]>([
    1, 1, 1,
  ]);
  const rollTimerRef = useRef<number | null>(null);
  const diceIntervalRef = useRef<number | null>(null);

  const bet = useMemo(() => {
    const n = Number(betText.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }, [betText]);

  const canPlay = bet >= MIN_BET && bet <= balance && !isRolling;
  const winProfit = useMemo(() => Math.floor(bet * (PAYOUT_MULTIPLIER - 1)), [bet]);
  const fairWinProb = 0.5;
  const expectedProfit = useMemo(
    () => Math.floor(fairWinProb * winProfit - (1 - fairWinProb) * bet),
    [bet, winProfit]
  );

  function play() {
    if (!canPlay) return;

    setIsRolling(true);

    if (diceIntervalRef.current) window.clearInterval(diceIntervalRef.current);
    diceIntervalRef.current = window.setInterval(() => {
      setDisplayDice([rollDie(), rollDie(), rollDie()]);
    }, 85);

    if (rollTimerRef.current) window.clearTimeout(rollTimerRef.current);
    rollTimerRef.current = window.setTimeout(() => {
      const d1 = rollDie();
      const d2 = rollDie();
      const d3 = rollDie();
      const sum = d1 + d2 + d3;
      const result = sumChoice(sum);

      const win = result === choice;
      const profit = win ? winProfit : -bet;
      const nextBalance = balance + profit;

      const round: Round = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: Date.now(),
        bet,
        choice,
        dice: [d1, d2, d3],
        sum,
        result,
        profit,
        balanceAfter: nextBalance,
      };

      setDisplayDice([d1, d2, d3]);
      setBalance(nextBalance);
      setLastRound(round);
      setHistory((prev) => [round, ...prev].slice(0, 30));

      if (diceIntervalRef.current) {
        window.clearInterval(diceIntervalRef.current);
        diceIntervalRef.current = null;
      }
      setIsRolling(false);
      rollTimerRef.current = null;
    }, ROLL_MS);
  }

  function reset() {
    if (rollTimerRef.current) {
      window.clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    }
    if (diceIntervalRef.current) {
      window.clearInterval(diceIntervalRef.current);
      diceIntervalRef.current = null;
    }
    setIsRolling(false);
    setDisplayDice([1, 1, 1]);
    setBalance(DEFAULT_BALANCE);
    setHistory([]);
    setLastRound(null);
    setBetText("10000");
    setChoice("tai");
  }

  return (
    <div className="relative flex flex-1 items-start justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-amber-50 px-4 py-10 text-zinc-950 dark:from-[#070815] dark:via-[#0b0b16] dark:to-[#0b111a] dark:text-zinc-50">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-400/30 via-indigo-400/25 to-amber-300/20 blur-3xl dark:from-fuchsia-500/15 dark:via-indigo-500/15 dark:to-amber-400/10" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-300/25 via-sky-300/20 to-violet-300/20 blur-3xl dark:from-emerald-500/10 dark:via-sky-500/10 dark:to-violet-500/10" />
      <div className="w-full max-w-3xl">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tài / Xỉu</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Luật: Tổng 3 xúc xắc 11–18 là <b>Tài</b>, 3–10 là <b>Xỉu</b>.
            </p>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Số dư
            </div>
            <div className="text-lg font-semibold tabular-nums">
              {formatVND(balance)}
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Chọn cửa</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChoice("tai")}
                  className={[
                    "h-12 rounded-2xl border px-4 text-sm font-semibold transition",
                    choice === "tai"
                      ? "border-transparent bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:brightness-110"
                      : "border-white/40 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  Tài (11–18)
                </button>
                <button
                  type="button"
                  onClick={() => setChoice("xiu")}
                  className={[
                    "h-12 rounded-2xl border px-4 text-sm font-semibold transition",
                    choice === "xiu"
                      ? "border-transparent bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm hover:brightness-110"
                      : "border-white/40 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  Xỉu (3–10)
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-medium">
                <span>Tiền cược</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tối thiểu {formatVND(MIN_BET)}
                </span>
              </div>
              <div className="flex gap-3">
                <input
                  inputMode="numeric"
                  value={betText}
                  onChange={(e) => setBetText(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/40 bg-white/70 px-4 text-sm tabular-nums outline-none ring-indigo-300/70 focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:ring-indigo-500/30"
                  placeholder="Nhập số tiền (VND)"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBetText(String(Math.min(balance, Math.max(MIN_BET, bet))))
                  }
                  className="h-12 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm font-semibold hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  title="Set cược = số hợp lệ gần nhất"
                >
                  OK
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[10_000, 20_000, 50_000, 100_000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBetText(String(v))}
                    className="h-9 rounded-full border border-white/40 bg-white/70 px-3 text-xs font-semibold hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    {formatVND(v)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBetText(String(balance))}
                  className="h-9 rounded-full border border-white/40 bg-white/70 px-3 text-xs font-semibold hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  All-in
                </button>
              </div>

              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Cược hợp lệ: {bet > 0 ? formatVND(bet) : "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={play}
              disabled={!canPlay}
              className={[
                "h-12 flex-1 rounded-2xl px-5 text-sm font-semibold transition",
                canPlay
                  ? "bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-sky-600 text-white shadow-sm hover:brightness-110 active:brightness-95"
                  : "cursor-not-allowed bg-white/50 text-zinc-500 dark:bg-white/5 dark:text-zinc-500",
              ].join(" ")}
            >
              {isRolling ? "Đang lắc..." : "Lắc xúc xắc"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-12 rounded-2xl border border-white/40 bg-white/70 px-5 text-sm font-semibold hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Reset (về 500.000)
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/30 bg-white/60 p-4 text-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-semibold">
                Trả thưởng: thắng nhận tổng{" "}
                <span className="text-indigo-700 dark:text-indigo-300">
                  {PAYOUT_MULTIPLIER.toFixed(2)}x
                </span>{" "}
                (lãi{" "}
                <span className="tabular-nums">
                  {formatVND(Math.max(0, winProfit))}
                </span>
                )
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Xác suất (công bằng): Tài 50% • Xỉu 50%
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Kỳ vọng mỗi ván (EV, công bằng):{" "}
              <span
                className={[
                  "font-semibold tabular-nums",
                  expectedProfit >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400",
                ].join(" ")}
              >
                {expectedProfit >= 0 ? "+" : "-"}
                {formatVND(Math.abs(expectedProfit))}
              </span>
            </div>
          </div>

          {!canPlay && (
            <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">
              {bet < MIN_BET
                ? `Tiền cược phải ≥ ${formatVND(MIN_BET)}.`
                : bet > balance
                  ? "Bạn không đủ số dư cho mức cược này."
                  : "Nhập tiền cược hợp lệ."}
            </div>
          )}

          {(isRolling || lastRound) && (
            <div className="mt-6 rounded-2xl border border-white/30 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold">
                  {isRolling ? (
                    <>Đang lắc xúc xắc…</>
                  ) : (
                    <>
                      Kết quả:{" "}
                      <span
                        className={
                          lastRound?.result === "tai"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-sky-700 dark:text-sky-400"
                        }
                      >
                        {lastRound?.result.toUpperCase()}
                      </span>{" "}
                      (tổng {lastRound?.sum})
                    </>
                  )}
                </div>
                {!isRolling && lastRound && (
                  <div
                    className={[
                      "text-sm font-semibold tabular-nums",
                      lastRound.profit >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400",
                    ].join(" ")}
                  >
                    {lastRound.profit >= 0 ? "+" : "-"}
                    {formatVND(Math.abs(lastRound.profit))}
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {(isRolling ? displayDice : lastRound?.dice ?? displayDice).map(
                  (d, idx) => (
                  <div
                    key={`${(lastRound?.id ?? "rolling")}-${idx}`}
                    className={[
                      "flex h-16 items-center justify-center rounded-2xl border border-white/40 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/10",
                      isRolling ? "dice-rolling" : "",
                    ].join(" ")}
                    aria-label={`Xúc xắc ${idx + 1}: ${d}`}
                  >
                    <DiceSvg value={d} />
                  </div>
                  )
                )}
              </div>
              {!isRolling && lastRound && (
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                  Bạn chọn: <b>{lastRound.choice.toUpperCase()}</b> • Số dư mới:{" "}
                  <b>{formatVND(lastRound.balanceAfter)}</b>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Lịch sử (tối đa 30)</h2>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Xoá lịch sử
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Chưa có ván nào. Bấm “Lắc xúc xắc” để bắt đầu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <tr className="border-b border-black/10 dark:border-white/10">
                    <th className="py-3 pr-4">Giờ</th>
                    <th className="py-3 pr-4">Cược</th>
                    <th className="py-3 pr-4">Chọn</th>
                    <th className="py-3 pr-4">Xúc xắc</th>
                    <th className="py-3 pr-4">Tổng</th>
                    <th className="py-3 pr-4">KQ</th>
                    <th className="py-3 pr-4">Lãi/Lỗ</th>
                    <th className="py-3">Số dư</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-black/5 last:border-b-0 dark:border-white/5"
                    >
                      <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                        {new Date(r.at).toLocaleTimeString("vi-VN")}
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums">
                        {formatVND(r.bet)}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {r.choice.toUpperCase()}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {r.dice.join(" - ")}
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums">
                        {r.sum}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {r.result.toUpperCase()}
                      </td>
                      <td
                        className={[
                          "py-3 pr-4 font-semibold tabular-nums",
                          r.profit >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400",
                        ].join(" ")}
                      >
                        {r.profit >= 0 ? "+" : "-"}
                        {formatVND(Math.abs(r.profit))}
                      </td>
                      <td className="py-3 font-semibold tabular-nums">
                        {formatVND(r.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
          Gợi ý: Đây là demo client-side (không lưu server). Reload trang sẽ reset
          số dư về 500.000 VND.
        </footer>
      </div>
    </div>
  );
}

