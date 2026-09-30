export const chapterUrl = (id: string, anchor?: string) =>
  "/learn?chapter=" +
  encodeURIComponent(id) +
  (anchor ? "&anchor=" + encodeURIComponent(anchor) : "");
