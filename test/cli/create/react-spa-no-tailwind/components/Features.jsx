import React from "react";
import Feature from "./Feature";

const FEATURES = [
  {
    icon: "⚡️",
    title: "Lightning Fast",
    description:
      "Built from scratch in Zig, Fun is focused on performance and developer experience",
    highlight: "Zig",
  },
  {
    icon: "🎯",
    title: "All-in-One",
    description:
      "Bundler, test runner, and npm-compatible package manager in a single tool",
  },
  {
    icon: "🚀",
    title: "JavaScript Runtime",
    description: "Drop-in replacement for Node.js with 3x faster startup time",
    highlight: "3x faster",
  },
  {
    icon: "📦",
    title: "Package Management",
    description:
      "Native package manager that can install dependencies up to 30x faster than npm",
    highlight: "30x faster",
  },
  {
    icon: "🧪",
    title: "Testing Made Simple",
    description:
      "Built-in test runner with Jest-compatible API and snapshot testing",
  },
  {
    icon: "🔥",
    title: "Hot Reloading",
    description:
      "Lightning-fast hot module replacement (HMR) for rapid development",
  },
];

export default function Features() {
  return (
    <section className="features-section">
      <h2>Why Choose Fun?</h2>
      <div className="features">
        {FEATURES.map((feature, index) => (
          <Feature key={index} {...feature} />
        ))}
      </div>
    </section>
  );
}
