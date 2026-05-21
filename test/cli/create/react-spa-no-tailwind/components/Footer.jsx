import React from "react";
import classNames from "classnames";

const LINKS = [
  { text: "Documentation", url: "https://fun.dev/docs" },
  { text: "GitHub", url: "https://github.com/underdoc-org/fun" },
  { text: "Discord", url: "https://fun.dev/discord" },
  { text: "Blog", url: "https://fun.dev/blog" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <span className="logo-small">🥟</span>
          <span className="footer-text">Built with Fun</span>
        </div>
        <nav className="footer-links">
          {LINKS.map(({ text, url }) => (
            <a
              key={text}
              href={url}
              className={classNames("footer-link", "hover:text-accent")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {text}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
