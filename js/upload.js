/**
 * upload.js — Photo upload handling for Six Handshakes
 *
 * Manages drag-and-drop and click-to-upload workflows, reads the file
 * as base64, and hands the result to a callback for Gemini analysis.
 *
 * Usage:
 *   import { initUpload } from "./upload.js";
 *   const ctl = initUpload({
 *     overlayEl:   document.getElementById("upload-overlay"),
 *     zoneEl:      document.getElementById("upload-zone"),
 *     fileInputEl: document.getElementById("file-input"),
 *     onPhotoReady(base64, mimeType, fileName) { ... },
 *     onCancel() { ... },
 *   });
 *   ctl.show();
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const LOG_PREFIX = "[Upload]";

/**
 * Initialise the upload controller.
 *
 * @param {object}           config
 * @param {HTMLElement}      config.overlayEl    The full-screen overlay backdrop
 * @param {HTMLElement}      config.zoneEl       The drop-zone element inside the overlay
 * @param {HTMLInputElement} config.fileInputEl  A hidden <input type="file">
 * @param {function}         config.onPhotoReady Called with (base64Data, mimeType, fileName)
 * @param {function}         config.onCancel     Called when the user dismisses the overlay
 * @returns {{ show, hide, destroy }}
 */
export function initUpload(config) {
  const { overlayEl, zoneEl, fileInputEl, onPhotoReady, onCancel } = config;

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------

  let visible = false;

  // We keep references to every listener so destroy() can clean up.
  const listeners = [];

  /**
   * Register an event listener and track it for later removal.
   */
  function on(el, event, handler, opts) {
    el.addEventListener(event, handler, opts);
    listeners.push({ el, event, handler, opts });
  }

  // ---------------------------------------------------------------
  // File processing
  // ---------------------------------------------------------------

  /**
   * Validate and read an image File, then invoke the callback.
   *
   * @param {File} file
   */
  function processFile(file) {
    if (!file) return;

    // MIME check
    if (!file.type.startsWith("image/")) {
      console.warn(LOG_PREFIX, "Rejected non-image file:", file.type);
      showZoneError("Please upload an image file.");
      return;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      console.warn(LOG_PREFIX, "File too large:", (file.size / 1024 / 1024).toFixed(1), "MB");
      showZoneError("Image must be under 10 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      // result is a data-URL like "data:image/jpeg;base64,/9j/4AAQ..."
      const dataUrl = reader.result;
      const mimeType = file.type;

      // Strip the data-URL prefix to get raw base64 for Gemini
      const base64Data = dataUrl.split(",")[1];

      flashZoneSuccess();
      hide();

      if (typeof onPhotoReady === "function") {
        onPhotoReady(base64Data, mimeType, file.name);
      }
    };

    reader.onerror = () => {
      console.error(LOG_PREFIX, "FileReader error:", reader.error);
      showZoneError("Failed to read file.");
    };

    reader.readAsDataURL(file);
  }

  // ---------------------------------------------------------------
  // Visual feedback helpers
  // ---------------------------------------------------------------

  /**
   * Briefly flash the zone green to confirm a successful drop/select.
   */
  function flashZoneSuccess() {
    zoneEl.classList.add("upload-success");
    setTimeout(() => zoneEl.classList.remove("upload-success"), 300);
  }

  /**
   * Show a transient error message inside the zone.
   */
  function showZoneError(message) {
    // Reuse or create a small error element inside the zone
    let errEl = zoneEl.querySelector(".upload-error");
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.className = "upload-error";
      zoneEl.appendChild(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = "block";

    setTimeout(() => {
      errEl.style.display = "none";
    }, 3000);
  }

  // ---------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------

  function handleDragEnter(e) {
    e.preventDefault();
    zoneEl.classList.add("drag-over");
  }

  function handleDragOver(e) {
    e.preventDefault();
    // Ensure the class stays applied while hovering
    zoneEl.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    // Only remove if we actually left the zone (not entering a child)
    if (!zoneEl.contains(e.relatedTarget)) {
      zoneEl.classList.remove("drag-over");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    zoneEl.classList.remove("drag-over");

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  // ---------------------------------------------------------------
  // Click / keyboard handlers
  // ---------------------------------------------------------------

  function handleZoneClick(e) {
    // Prevent the click from bubbling to the overlay (which would cancel)
    e.stopPropagation();
    fileInputEl.click();
  }

  function handleFileChange() {
    const file = fileInputEl.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset so the same file can be re-selected
    fileInputEl.value = "";
  }

  function handleOverlayClick(e) {
    // Click on the backdrop (outside the zone) cancels
    if (e.target === overlayEl) {
      cancel();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape" && visible) {
      cancel();
    }
  }

  // ---------------------------------------------------------------
  // Show / hide / cancel / destroy
  // ---------------------------------------------------------------

  function show() {
    visible = true;
    document.body.classList.add("upload-active");
    // Reset any leftover state
    zoneEl.classList.remove("drag-over", "upload-success");
    const errEl = zoneEl.querySelector(".upload-error");
    if (errEl) errEl.style.display = "none";
  }

  function hide() {
    visible = false;
    document.body.classList.remove("upload-active");
    zoneEl.classList.remove("drag-over", "upload-success");
  }

  function cancel() {
    hide();
    if (typeof onCancel === "function") {
      onCancel();
    }
  }

  /**
   * Remove all event listeners. Call this when the upload UI is
   * permanently torn down.
   */
  function destroy() {
    hide();
    for (const { el, event, handler, opts } of listeners) {
      el.removeEventListener(event, handler, opts);
    }
    listeners.length = 0;
  }

  // ---------------------------------------------------------------
  // Bind events
  // ---------------------------------------------------------------

  on(zoneEl, "dragenter", handleDragEnter);
  on(zoneEl, "dragover", handleDragOver);
  on(zoneEl, "dragleave", handleDragLeave);
  on(zoneEl, "drop", handleDrop);
  on(zoneEl, "click", handleZoneClick);
  on(fileInputEl, "change", handleFileChange);
  on(overlayEl, "click", handleOverlayClick);
  on(document, "keydown", handleKeyDown);

  // ---------------------------------------------------------------
  // Return public controller
  // ---------------------------------------------------------------

  return { show, hide, destroy };
}
