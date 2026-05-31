export default function Loader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid var(--border-light)",
          borderTopColor: "var(--accent-blue)",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
      <span
        style={{
          color: "var(--text-secondary)",
          fontSize: "13px",
        }}
      >
        Loading...
      </span>
    </div>
  );
}