/**
 * The browser half of backup: turning an object into a file the player
 * keeps, and a file they picked back into text.
 *
 * Split from backup.ts so the export/restore LOGIC stays testable in a
 * plain node environment — this module is the part that only works in a
 * document, and it is deliberately tiny.
 */

/**
 * Hand a JSON file to the player.
 *
 * The object URL is revoked on the next frame rather than immediately:
 * Safari has historically cancelled an in-flight download when the URL
 * is revoked in the same tick as the click.
 */
export function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Read a picked file as text, rejecting rather than resolving empty. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}
