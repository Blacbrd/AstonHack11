export default function LoadingScreen({ message = "Preparing your meditation..." }) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{message}</div>
        <div style={{ opacity: 0.75 }}>Loading audio and starting session…</div>
      </div>
    </div>
  );
}
