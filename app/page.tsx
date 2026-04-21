"use client";

export default function Home() {
  const TaiXiuPage = require("./taixiu/page").default as React.ComponentType;
  return <TaiXiuPage />;
}
