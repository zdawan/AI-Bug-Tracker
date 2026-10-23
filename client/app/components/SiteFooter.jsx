import Link from "next/link";
import {
  ArrowUpRight,
  Bug,
  Code2,
  Github,
  Heart,
  ShieldCheck,
} from "lucide-react";

const footerGroups = [
  {
    title: "WORKSPACES",
    links: [
      {
        label: "Tester workspace",
        href: "/tester/url",
      },
      {
        label: "Developer portal",
        href: "/admin/login",
      },
    ],
  },
];

function FooterBrand() {
  return (
    <Link href="/" className="footer-brand" aria-label="AI Bug Tracker home">
      <span className="footer-brand-mark">
        <Bug size={21} strokeWidth={1.8} />
      </span>

      <span className="footer-brand-copy">
        <span className="footer-brand-title">AI Bug Tracker</span>

        <span className="footer-brand-caption">
          A clearer way to track issues.
        </span>
      </span>
    </Link>
  );
}

function FooterNavigation({ group }) {
  return (
    <div className="footer-nav-group">
      <h3>{group.title}</h3>

      <ul>
        {group.links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>
              <span>{link.label}</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="footer-bottom">
      <p>© {new Date().getFullYear()} AI Bug Tracker</p>

      <p className="footer-made-note">
        Built to make debugging a little clearer.
      </p>

      <Link
        href="/"
        className="footer-back-to-top"
        aria-label="Back to homepage"
      >
        Back to top
        <ArrowUpRight size={13} />
      </Link>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand-column">
            <FooterBrand />

            <p className="footer-description">
              A place for testers to report issues and for developers to review
              them, understand the details, and keep work moving.
            </p>

            <div className="footer-product-note">
              <span className="footer-product-icon">
                <Code2 size={15} />
              </span>

              <span>Made for the people behind the product.</span>
            </div>
          </div>

          <div className="footer-navigation">
            {footerGroups.map((group) => (
              <FooterNavigation key={group.title} group={group} />
            ))}

            <div className="footer-nav-group footer-about">
              <h3>THE APPROACH</h3>

              <p>
                Better context for issues. A more visible path to resolution.
              </p>

              <span className="footer-security-note">
                <ShieldCheck size={14} />
                <span>Role-based access</span>
              </span>
            </div>
          </div>
        </div>

        <FooterBottom />
      </div>
    </footer>
  );
}
