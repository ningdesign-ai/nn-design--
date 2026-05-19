const VIEW_CODE = "portfolio";
const AUTHOR_CODE = "portfolio-edit";
const AUTHOR_STORAGE_KEY = "portfolio-author";
const lockScreen = document.getElementById("lock-screen");
const siteContent = document.getElementById("site-content");
const uploadSection = document.getElementById("upload");
const authorBadge = document.getElementById("author-badge");
const accessInput = document.getElementById("access-code");
const unlockButton = document.getElementById("unlock-button");
const lockError = document.getElementById("lock-error");
const videoFileInput = document.getElementById("video-file");
const imageFileInput = document.getElementById("image-file");
const imageTitleInput = document.getElementById("image-title");
const imageDescriptionInput = document.getElementById("image-description");
const uploadVideoButton = document.getElementById("upload-video");
const uploadImageButton = document.getElementById("upload-image");
const videoGrid = document.querySelector("#videos .grid");
const imageGrid = document.querySelector("#images .grid");

function getAuthorSaved() {
  return localStorage.getItem(AUTHOR_STORAGE_KEY) === "true";
}

function setAuthorMode(enabled) {
  if (uploadSection) {
    uploadSection.classList.toggle("hidden", !enabled);
  }
  if (authorBadge) {
    authorBadge.classList.toggle("hidden", !enabled);
  }
  localStorage.setItem(AUTHOR_STORAGE_KEY, enabled ? "true" : "false");
}

function setLockError(message) {
  if (!lockError) return;
  if (!message) {
    lockError.textContent = "";
    lockError.classList.add("hidden");
    return;
  }
  lockError.textContent = message;
  lockError.classList.remove("hidden");
}

function unlockPage() {
  const hash = window.location.hash.slice(1).trim();
  const inputValue = accessInput ? accessInput.value.trim() : "";
  const savedAuthor = getAuthorSaved();
  const isView = hash === VIEW_CODE || inputValue === VIEW_CODE;
  const isAuthor = hash === AUTHOR_CODE || inputValue === AUTHOR_CODE || savedAuthor;
  const isUnlocked = isView || isAuthor;

  if (isUnlocked) {
    if (inputValue === VIEW_CODE && hash !== VIEW_CODE) {
      window.location.hash = VIEW_CODE;
    }
    if (inputValue === AUTHOR_CODE && hash !== AUTHOR_CODE) {
      window.location.hash = AUTHOR_CODE;
    }
    setLockError("");
    lockScreen.classList.add("hidden");
    siteContent.classList.remove("hidden");
    setAuthorMode(isAuthor);
  } else {
    lockScreen.classList.remove("hidden");
    siteContent.classList.add("hidden");
    setAuthorMode(false);
    if (inputValue) {
      setLockError("访问码不正确，请确认输入 portfolio 或 portfolio-edit。");
    } else {
      setLockError("");
    }
  }
}

function addVideoWork(file) {
  if (!videoGrid) return;
  const url = URL.createObjectURL(file);
  const item = document.createElement("article");
  item.className = "card";
  item.innerHTML = `
    <div class="video-preview">
      <video controls src="${url}" preload="metadata"></video>
    </div>
    <div class="card-body">
      <h3>${file.name}</h3>
      <p>已上传的视频作品，页面会直接播放。</p>
    </div>
  `;
  videoGrid.prepend(item);
}

function addImageWork(file, title, description) {
  if (!imageGrid) return;
  const url = URL.createObjectURL(file);
  const item = document.createElement("article");
  item.className = "card";
  item.innerHTML = `
    <img src="${url}" alt="${title}" />
    <div class="card-body">
      <h3>${title || file.name}</h3>
      <p>${description || "已上传的图文作品。"}</p>
    </div>
  `;
  imageGrid.prepend(item);
}

function uploadVideo() {
  if (!videoFileInput || !videoFileInput.files.length) {
    window.alert("请选择一个视频文件后再上传。");
    return;
  }
  addVideoWork(videoFileInput.files[0]);
  videoFileInput.value = "";
}

function uploadImage() {
  if (!imageFileInput || !imageFileInput.files.length) {
    window.alert("请选择一张图片后再上传。");
    return;
  }
  addImageWork(imageFileInput.files[0], imageTitleInput.value.trim(), imageDescriptionInput.value.trim());
  imageFileInput.value = "";
  imageTitleInput.value = "";
  imageDescriptionInput.value = "";
}

if (unlockButton) {
  unlockButton.addEventListener("click", unlockPage);
}

if (accessInput) {
  accessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockPage();
    }
  });
}

if (uploadVideoButton) {
  uploadVideoButton.addEventListener("click", uploadVideo);
}

if (uploadImageButton) {
  uploadImageButton.addEventListener("click", uploadImage);
}

window.addEventListener("load", unlockPage);
window.addEventListener("hashchange", unlockPage);
