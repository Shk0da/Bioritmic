export const LEGAL_CONTENT_STYLES = `
  section {
    margin-bottom: 1.25rem;
  }

  h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  p, li {
    font-size: 0.92rem;
    line-height: 1.55;
    color: var(--text-primary, #1f2937);
  }

  ul {
    padding-left: 1.2rem;
    margin-bottom: 0.75rem;
  }

  a, .legal-inline-link {
    color: #fd297b;
    font-weight: 600;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }

  a:hover, .legal-inline-link:hover {
    text-decoration: underline;
  }
`;
