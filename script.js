// === 设备认证配置 ===
var DEVICE_REGISTRATION_KEY = "88888886";
var AUTHOR_DEVICE_KEY = "portfolio-author-device";
var AUTHOR_STORAGE_KEY = "portfolio-author";
var BASE_SITE_URL = "https://ningdesign-ai.github.io/nn-design--/";

var bodyElement = document.body;
var siteContent = document.getElementById("site-content");
var uploadSection = document.getElementById("upload");
var authorBadge = document.getElementById("author-badge");
var deauthButton = document.getElementById("deauthorize-device");

var videoFileInput = document.getElementById("video-file");
var projectTitleInput = document.getElementById("project-title");
var projectBriefInput = document.getElementById("project-brief");
var projectImagesInput = document.getElementById("project-images");
var projectTimelineInput = document.getElementById("project-timeline");
var projectContentInput = document.getElementById("project-content");
var projectResultsInput = document.getElementById("project-results");
var bannerFileInput = document.getElementById("banner-file");
var uploadBannerButton = document.getElementById("upload-banner");
var removeBannerButton = document.getElementById("remove-banner");
var footerBannerFileInput = document.getElementById("footer-banner-file");
var uploadFooterBannerBtn = document.getElementById("upload-footer-banner");
var removeFooterBannerBtn = document.getElementById("remove-footer-banner");
var headerArea = document.getElementById("header-area");
var heroBanner = document.getElementById("hero-banner");
var footerBanner = document.getElementById("footer-banner");
var uploadVideoButton = document.getElementById("upload-video");
var uploadProjectButton = document.getElementById("upload-project");
var videoGrid = document.querySelector("#videos .grid");
var imageGrid = document.querySelector("#images .grid");

// === IndexedDB 持久化存储 ===
var DB_NAME = "portfolio-works";
var DB_VERSION = 1;
var STORE_NAME = "works";

function openDB() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = function (e) { resolve(e.target.result); };
    request.onerror = function (e) { reject(e.target.error); };
  });
}

function saveWorkToDB(work) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(work);
    return new Promise(function (resolve) {
      tx.oncomplete = function () { resolve(); };
    });
  });
}

function loadAllWorksFromDB() {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var request = tx.objectStore(STORE_NAME).getAll();
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error); };
    });
  });
}

function deleteWorkFromDB(id) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise(function (resolve) {
      tx.oncomplete = function () { resolve(); };
    });
  });
}

function updateWorkInDB(id, updates) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    var store = tx.objectStore(STORE_NAME);
    var getReq = store.get(id);
    return new Promise(function (resolve, reject) {
      getReq.onsuccess = function () {
        var work = getReq.result;
        if (!work) return reject(new Error("Work not found"));
        Object.keys(updates).forEach(function (key) {
          work[key] = updates[key];
        });
        store.put(work);
        tx.oncomplete = function () { resolve(); };
      };
      getReq.onerror = function () { reject(getReq.error); };
    });
  });
}

function generateWorkId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// === Banner 背景 ===
function applyBannerToBody(url, pos, zoom) {
  if (!headerArea) return;
  headerArea.style.backgroundImage = url ? "url(" + url + ")" : "";
  headerArea.style.backgroundPosition = "50% " + (pos || 50) + "%";
  headerArea.style.backgroundSize = (zoom && zoom > 1) ? (zoom * 100) + "%" : (url ? "cover" : "");
  headerArea.style.backgroundRepeat = "no-repeat";
}

function loadBannerFromDB() {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var req = tx.objectStore(STORE_NAME).get("site-banner");
    return new Promise(function (resolve) {
      req.onsuccess = function () {
        var data = req.result;
        if (data && data.fileData) {
          var url = URL.createObjectURL(data.fileData);
          applyBannerToBody(url, data.bannerPosition, data.bannerZoom);
        }
        resolve();
      };
      req.onerror = function () { resolve(); };
    });
  });
}

function removeBanner() {
  deleteWorkFromDB("site-banner").then(function () {
    applyBannerToBody("", 50, null);
  }).catch(function () {});
}

function saveBanner(file, bannerPos, bannerZoom) {
  var record = { id: "site-banner", type: "banner", fileData: file };
  if (bannerPos != null) record.bannerPosition = bannerPos;
  if (bannerZoom != null) record.bannerZoom = bannerZoom;
  return saveWorkToDB(record).then(function () {
    var url = URL.createObjectURL(file);
    applyBannerToBody(url, bannerPos != null ? bannerPos : 50, bannerZoom != null ? bannerZoom : 1);
  });
}

function removeBanner() {
  deleteWorkFromDB("site-banner").then(function () {
    if (heroBanner) {
      heroBanner.style.backgroundImage = "";
      heroBanner.style.backgroundPosition = "";
      heroBanner.style.backgroundSize = "";
    }
  }).catch(function () {});
}

function openBannerCrop(file, bannerId, targetEl) {
  var url = URL.createObjectURL(file);
  var overlay = document.createElement("div");
  overlay.className = "crop-overlay";

  var dialog = document.createElement("div");
  dialog.className = "crop-dialog banner-crop-dialog";

  var title = document.createElement("h3");
  title.textContent = "调整 Banner 裁切";
  var hint = document.createElement("p");
  hint.className = "crop-hint";
  hint.textContent = "拖动滑块调整可见区域和缩放比例";

  var previewBox = document.createElement("div");
  previewBox.className = "banner-crop-preview";
  var previewImg = document.createElement("img");
  previewImg.src = url;

  function applyPreview(pos, zoom) {
    previewImg.style.objectPosition = "50% " + pos + "%";
    previewImg.style.transform = "scale(" + zoom + ")";
    previewImg.style.transformOrigin = "50% 50%";
  }
  applyPreview(50, 1);

  previewBox.appendChild(previewImg);

  // 位置滑块
  var posRow = document.createElement("div");
  posRow.className = "crop-slider-row";
  var posLabel = document.createElement("span");
  posLabel.className = "crop-slider-label";
  posLabel.textContent = "位置";
  var posSlider = document.createElement("input");
  posSlider.type = "range"; posSlider.min = 0; posSlider.max = 100; posSlider.value = 50;
  posSlider.className = "crop-slider";
  var posVal = document.createElement("span");
  posVal.className = "crop-pos-label"; posVal.textContent = "50%";
  posRow.appendChild(posLabel); posRow.appendChild(posSlider); posRow.appendChild(posVal);

  posSlider.addEventListener("input", function () {
    var val = parseInt(posSlider.value, 10);
    applyPreview(val, parseFloat(zoomSlider.value));
    posVal.textContent = val + "%";
  });

  // 缩放滑块
  var zoomRow = document.createElement("div");
  zoomRow.className = "crop-slider-row";
  var zoomLabel = document.createElement("span");
  zoomLabel.className = "crop-slider-label";
  zoomLabel.textContent = "缩放";
  var zoomSlider = document.createElement("input");
  zoomSlider.type = "range"; zoomSlider.min = 1; zoomSlider.max = 3; zoomSlider.step = 0.05; zoomSlider.value = 1;
  zoomSlider.className = "crop-slider";
  var zoomVal = document.createElement("span");
  zoomVal.className = "crop-pos-label"; zoomVal.textContent = "1x";
  zoomRow.appendChild(zoomLabel); zoomRow.appendChild(zoomSlider); zoomRow.appendChild(zoomVal);

  zoomSlider.addEventListener("input", function () {
    var val = parseFloat(zoomSlider.value);
    applyPreview(parseInt(posSlider.value, 10), val);
    zoomVal.textContent = val.toFixed(2) + "x";
  });

  var btnRow = document.createElement("div");
  btnRow.className = "crop-btn-row";

  var cancelBtn = document.createElement("button");
  cancelBtn.textContent = "取消";
  cancelBtn.addEventListener("click", function () { overlay.remove(); });

  var okBtn = document.createElement("button");
  okBtn.textContent = "确定";
  okBtn.className = "crop-ok-btn";
  okBtn.addEventListener("click", function () {
    var pos = parseInt(posSlider.value, 10);
    var zoom = parseFloat(zoomSlider.value);
    var record = { id: bannerId, type: "banner", fileData: file, bannerPosition: pos, bannerZoom: zoom };
    saveWorkToDB(record).then(function () {
      var u = URL.createObjectURL(file);
      if (targetEl) {
        targetEl.style.backgroundImage = "url(" + u + ")";
        targetEl.style.backgroundPosition = "50% " + pos + "%";
        targetEl.style.backgroundSize = zoom > 1 ? (zoom * 100) + "%" : "cover";
      }
      if (bannerId === "site-banner") {
        applyBannerToBody(u, pos, zoom);
      }
    }).catch(function () {});
    overlay.remove();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(okBtn);

  dialog.appendChild(title);
  dialog.appendChild(hint);
  dialog.appendChild(previewBox);
  dialog.appendChild(posRow);
  dialog.appendChild(zoomRow);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function uploadBanner() {
  if (!bannerFileInput || !bannerFileInput.files.length) {
    window.alert("请选择一张图片。");
    return;
  }
  openBannerCrop(bannerFileInput.files[0], "site-banner", null);
  bannerFileInput.value = "";
}

// === 底部 Banner ===
function loadFooterBannerFromDB() {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var req = tx.objectStore(STORE_NAME).get("site-footer-banner");
    return new Promise(function (resolve) {
      req.onsuccess = function () {
        var data = req.result;
        if (data && data.fileData) {
          var url = URL.createObjectURL(data.fileData);
          if (footerBanner) {
            footerBanner.style.backgroundImage = "url(" + url + ")";
            if (data.bannerPosition != null) {
              footerBanner.style.backgroundPosition = "50% " + data.bannerPosition + "%";
            }
            if (data.bannerZoom != null && data.bannerZoom > 1) {
              footerBanner.style.backgroundSize = (data.bannerZoom * 100) + "%";
            } else {
              footerBanner.style.backgroundSize = "cover";
            }
          }
        }
        resolve();
      };
      req.onerror = function () { resolve(); };
    });
  });
}

function saveFooterBanner(file, pos, zoom) {
  var record = { id: "site-footer-banner", type: "footer-banner", fileData: file };
  if (pos != null) record.bannerPosition = pos;
  if (zoom != null) record.bannerZoom = zoom;
  return saveWorkToDB(record).then(function () {
    var url = URL.createObjectURL(file);
    if (footerBanner) {
      footerBanner.style.backgroundImage = "url(" + url + ")";
      if (pos != null) footerBanner.style.backgroundPosition = "50% " + pos + "%";
      if (zoom != null && zoom > 1) {
        footerBanner.style.backgroundSize = (zoom * 100) + "%";
      } else {
        footerBanner.style.backgroundSize = "cover";
      }
    }
  });
}

function removeFooterBanner() {
  deleteWorkFromDB("site-footer-banner").then(function () {
    if (footerBanner) {
      footerBanner.style.backgroundImage = "";
      footerBanner.style.backgroundPosition = "";
      footerBanner.style.backgroundSize = "";
    }
  }).catch(function () {});
}

function uploadFooterBanner() {
  if (!footerBannerFileInput || !footerBannerFileInput.files.length) {
    window.alert("请选择一张图片。");
    return;
  }
  openBannerCrop(footerBannerFileInput.files[0], "site-footer-banner", footerBanner);
  footerBannerFileInput.value = "";
}

// 内存缓存：IndexedDB 加载的项目数据
var allProjects = {};

// === 设备指纹 ===
function generateDeviceFingerprint() {
  var components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.colorDepth,
    screen.width,
    screen.height,
    navigator.hardwareConcurrency || 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  var str = components.join("|");
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "dev-" + Math.abs(hash).toString(36);
}

function isAuthorDevice() {
  var saved = localStorage.getItem(AUTHOR_DEVICE_KEY);
  if (!saved) return false;
  return saved === generateDeviceFingerprint();
}

function registerAuthorDevice(key) {
  if (key !== DEVICE_REGISTRATION_KEY) return false;
  localStorage.setItem(AUTHOR_DEVICE_KEY, generateDeviceFingerprint());
  localStorage.setItem(AUTHOR_STORAGE_KEY, "true");
  return true;
}

function deauthorizeDevice() {
  localStorage.removeItem(AUTHOR_DEVICE_KEY);
  localStorage.removeItem(AUTHOR_STORAGE_KEY);
  window.location.reload();
}

// === 模式切换 ===
var gIsAuthor = false;

function setAuthorMode(enabled) {
  gIsAuthor = enabled;
  if (uploadSection) {
    uploadSection.classList.toggle("hidden", !enabled);
  }
  if (authorBadge) {
    authorBadge.textContent = enabled ? "作者模式" : "读者模式";
    authorBadge.classList.remove("hidden");
  }
  if (deauthButton) {
    deauthButton.classList.toggle("hidden", !enabled);
  }
  localStorage.setItem(AUTHOR_STORAGE_KEY, enabled ? "true" : "false");
  refreshCardSettings();
}

// === URL 参数解析 ===
function getUrlAccessCode() {
  var params = new URLSearchParams(window.location.search);
  return (
    params.get("access") ||
    params.get("auth") ||
    params.get("code") ||
    ""
  ).trim();
}

// === 水印图案生成 ===
var watermarkDataUrl = null;

function getWatermarkDataUrl() {
  if (watermarkDataUrl) return watermarkDataUrl;
  var canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 120;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.font = "15px 'Helvetica Neue', Arial, sans-serif";
  ctx.translate(100, 60);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("宁宁作品集", 0, 0);
  watermarkDataUrl = canvas.toDataURL();
  return watermarkDataUrl;
}

// === 页面授权 ===
function authorizePage() {
  var hash = window.location.hash.slice(1).trim();
  var urlAccess = getUrlAccessCode();
  var registrationKey = urlAccess || hash;

  if (registrationKey === DEVICE_REGISTRATION_KEY && !isAuthorDevice()) {
    registerAuthorDevice(DEVICE_REGISTRATION_KEY);
    window.location.href = getBaseUrl();
    return;
  }

  var isAuthor = isAuthorDevice();

  setAuthorMode(isAuthor);

  if (bodyElement) {
    bodyElement.classList.add("visible");
  }

  // 先渲染持久化的作品，再初始化所有卡片
  loadBannerFromDB().catch(function () {}).then(function () {
    return loadFooterBannerFromDB().catch(function () {});
  }).then(function () {
    return renderPersistedWorks();
  }).then(function () {
    initAllCards();
  });
}

// === 从 IndexedDB 渲染已保存的作品 ===
function renderPersistedWorks() {
  return loadAllWorksFromDB().then(function (works) {
    if (!works.length) return;
    works.sort(function (a, b) { return b.createdAt - a.createdAt; });
    works.forEach(function (work) {
      if (work.type === "image-project") {
        // 将 IndexedDB 中的 Blob 转为 blob URL
        work.images = (work.images || []).map(function (img) {
          return {
            url: img.fileData ? URL.createObjectURL(img.fileData) : img.url,
            fileName: img.fileName
          };
        });
        if (work.coverFileData) {
          work.coverUrl = URL.createObjectURL(work.coverFileData);
        }
        allProjects[work.id] = work;
        renderProjectCard(work);
      } else {
        renderWorkCard(work);
      }
    });
  });
}

function renderProjectCard(project) {
  var coverUrl = project.coverUrl;
  if (!coverUrl && project.images && project.images.length) {
    coverUrl = project.images[0].url;
  }
  if (!coverUrl) return;
  var coverPos = project.coverPosition != null ? project.coverPosition : 50;
  var coverZoom = project.coverZoom != null ? project.coverZoom : 1;
  var card = document.createElement("article");
  card.className = "card project-card";
  card.setAttribute("data-project-id", project.id);
  card.innerHTML =
    '<div class="card-media">' +
    '<img src="' + coverUrl + '" alt="' + (project.title || "") + '" style="object-position: 50% ' + coverPos + '%; transform: scale(' + coverZoom + '); transform-origin: 50% 50%;" />' +
    '</div>' +
    '<div class="card-body">' +
    '<h3>' + (project.title || "") + '</h3>' +
    '<p>' + (project.brief || "") + '</p>' +
    '</div>';
  if (imageGrid) imageGrid.appendChild(card);
}

function renderWorkCard(work) {
  var url = URL.createObjectURL(work.fileData);
  var mediaHTML;
  if (work.type === "video") {
    mediaHTML = '<div class="video-preview"><video src="' + url + '" preload="metadata" muted></video></div>';
  } else {
    mediaHTML = '<img src="' + url + '" alt="' + (work.title || work.fileName) + '" />';
  }
  var card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-work-id", work.id);
  card.innerHTML =
    '<div class="card-media">' + mediaHTML + '</div>' +
    '<div class="card-body">' +
    '<h3>' + (work.title || work.fileName) + '</h3>' +
    '<p>' + (work.description || "") + '</p>' +
    '</div>';

  if (work.type === "video" && videoGrid) {
    videoGrid.appendChild(card);
  } else if (work.type === "image" && imageGrid) {
    imageGrid.appendChild(card);
  }
}

// === 项目详情面板 ===
function openProjectDetail(projectId) {
  var project = allProjects[projectId];
  if (!project) return;

  var overlay = document.createElement("div");
  overlay.className = "project-detail-overlay";
  overlay.setAttribute("data-project-id", projectId);

  var panel = document.createElement("div");
  panel.className = "project-detail-panel";

  var closeBtn = document.createElement("button");
  closeBtn.className = "project-detail-close";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeProjectDetail(projectId);
  });

  var imagesDiv = document.createElement("div");
  imagesDiv.className = "project-detail-images";
  buildDetailImages(imagesDiv, project, projectId);

  var infoDiv = document.createElement("div");
  infoDiv.className = "project-detail-info";
  buildDetailInfo(infoDiv, project, projectId);

  panel.appendChild(closeBtn);
  panel.appendChild(imagesDiv);
  panel.appendChild(infoDiv);
  overlay.appendChild(panel);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeProjectDetail(projectId);
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

function buildDetailImages(container, project, projectId) {
  container.innerHTML = "";
  // 跳过封面图（index 0），封面只用于卡片展示；仅一张图时不跳过
  var images = project.images || [];
  var skipCover = images.length > 1;
  images.forEach(function (img, index) {
    if (skipCover && index === 0) return;

    var wrapper = document.createElement("div");
    wrapper.className = "detail-image-wrapper";

    var imgEl = document.createElement("img");
    imgEl.src = img.url;
    imgEl.alt = project.title;
    wrapper.appendChild(imgEl);

    if (gIsAuthor) {
      var actions = document.createElement("div");
      actions.className = "detail-image-actions";

      var upBtn = document.createElement("button");
      upBtn.innerHTML = "&#8593;";
      upBtn.title = "上移";
      upBtn.disabled = skipCover ? index <= 1 : index === 0;
      upBtn.addEventListener("click", function () {
        reorderProjectImage(projectId, index, index - 1, container);
      });

      var downBtn = document.createElement("button");
      downBtn.innerHTML = "&#8595;";
      downBtn.title = "下移";
      downBtn.disabled = index === (project.images || []).length - 1;
      downBtn.addEventListener("click", function () {
        reorderProjectImage(projectId, index, index + 1, container);
      });

      var delBtn = document.createElement("button");
      delBtn.innerHTML = "&#x2715;";
      delBtn.className = "img-del";
      delBtn.title = "删除图片";
      delBtn.addEventListener("click", function () {
        deleteProjectImage(projectId, index, container);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(actions);
    }

    container.appendChild(wrapper);
  });

  if (gIsAuthor) {
    var addBtn = document.createElement("button");
    addBtn.className = "detail-add-image-btn";
    addBtn.textContent = "+ 添加图片";
    addBtn.addEventListener("click", function () {
      addProjectImages(projectId, container);
    });
    container.appendChild(addBtn);
  }
}

function reorderProjectImage(projectId, fromIndex, toIndex, container) {
  var project = allProjects[projectId];
  if (!project) return;
  var images = project.images;
  var tmp = images[fromIndex];
  images[fromIndex] = images[toIndex];
  images[toIndex] = tmp;
  buildDetailImages(container, project, projectId);
  persistProjectToDB(projectId);
}

function deleteProjectImage(projectId, index, container) {
  var project = allProjects[projectId];
  if (!project || project.images.length <= 1) {
    window.alert("项目至少保留一张图片。");
    return;
  }
  project.images.splice(index, 1);
  buildDetailImages(container, project, projectId);
  persistProjectToDB(projectId);
  refreshProjectCard(projectId);
}

function addProjectImages(projectId, container) {
  var project = allProjects[projectId];
  if (!project) return;
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.addEventListener("change", function () {
    if (!input.files || !input.files.length) return;
    Array.from(input.files).forEach(function (file) {
      project.images.push({ url: URL.createObjectURL(file), fileName: file.name, fileData: file });
    });
    buildDetailImages(container, project, projectId);
    persistProjectToDB(projectId);
  });
  input.click();
}

function buildDetailInfo(container, project, projectId) {
  container.innerHTML = "";

  var titleEl = document.createElement("h2");
  titleEl.textContent = project.title || "";
  if (gIsAuthor) titleEl.contentEditable = "true";

  var briefEl = document.createElement("p");
  briefEl.className = "project-brief";
  briefEl.textContent = project.brief || "";
  if (gIsAuthor) briefEl.contentEditable = "true";

  function makeInfoBlock(label, value) {
    var block = document.createElement("div");
    block.className = "info-block";
    var h4 = document.createElement("h4");
    h4.textContent = label;
    var p = document.createElement("p");
    p.textContent = value || "未填写";
    if (gIsAuthor) p.contentEditable = "true";
    block.appendChild(h4);
    block.appendChild(p);
    return block;
  }

  container.appendChild(titleEl);
  container.appendChild(briefEl);
  container.appendChild(makeInfoBlock("项目时间", project.timeline));
  container.appendChild(makeInfoBlock("项目内容", project.content));
  container.appendChild(makeInfoBlock("项目结果", project.results));

  if (gIsAuthor) {
    container.querySelectorAll('[contenteditable="true"]').forEach(function (el) {
      el.addEventListener("blur", function () {
        saveDetailEdits(container, projectId);
      });
    });
  }
}

function saveDetailEdits(container, projectId) {
  var project = allProjects[projectId];
  if (!project) return;
  var titleEl = container.querySelector("h2");
  var briefEl = container.querySelector(".project-brief");
  var infoPs = container.querySelectorAll(".info-block p");
  if (titleEl) project.title = titleEl.textContent;
  if (briefEl) project.brief = briefEl.textContent;
  if (infoPs.length >= 3) {
    project.timeline = infoPs[0].textContent;
    project.content = infoPs[1].textContent;
    project.results = infoPs[2].textContent;
  }
  persistProjectToDB(projectId);
  refreshProjectCard(projectId);
}

function persistProjectToDB(projectId) {
  var project = allProjects[projectId];
  if (!project) return;
  updateWorkInDB(projectId, {
    title: project.title,
    brief: project.brief,
    timeline: project.timeline,
    content: project.content,
    results: project.results,
    images: (project.images || []).map(function (img) {
      return { fileName: img.fileName, fileData: img.fileData || null };
    }),
    coverFileData: project.images && project.images.length ? project.images[0].fileData : null,
    coverPosition: project.coverPosition,
    coverZoom: project.coverZoom
  }).catch(function () {});
}

function refreshProjectCard(projectId) {
  var card = document.querySelector('.project-card[data-project-id="' + projectId + '"]');
  if (!card) return;
  var project = allProjects[projectId];
  if (!project) return;
  var coverUrl = project.images && project.images.length ? project.images[0].url : "";
  if (coverUrl) {
    var img = card.querySelector(".card-media img");
    if (img) {
      img.src = coverUrl;
      var pos = project.coverPosition != null ? project.coverPosition : 50;
      var zoom = project.coverZoom != null ? project.coverZoom : 1;
      img.style.objectPosition = "50% " + pos + "%";
      img.style.transform = "scale(" + zoom + ")";
      img.style.transformOrigin = "50% 50%";
    }
  }
  var h3 = card.querySelector(".card-body h3");
  if (h3) h3.textContent = project.title || "";
  var p = card.querySelector(".card-body p");
  if (p) p.textContent = project.brief || "";
}

function closeProjectDetail(projectId) {
  var overlay = document.querySelector(".project-detail-overlay");
  if (!overlay) return;
  var pid = projectId || overlay.getAttribute("data-project-id");
  if (pid) {
    var infoDiv = overlay.querySelector(".project-detail-info");
    if (infoDiv) saveDetailEdits(infoDiv, pid);
  }
  overlay.remove();
  document.body.style.overflow = "";
}

function getProjectData(projectId) {
  if (allProjects[projectId]) return Promise.resolve(allProjects[projectId]);
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var req = tx.objectStore(STORE_NAME).get(projectId);
    return new Promise(function (resolve) {
      req.onsuccess = function () {
        var data = req.result;
        if (data) allProjects[projectId] = data;
        resolve(data || null);
      };
      req.onerror = function () { resolve(null); };
    });
  });
}

// === 灯箱 ===
function openLightbox(mediaEl) {
  var isVideo = mediaEl.tagName === "VIDEO";
  var isVideoPreview = mediaEl.closest(".video-preview") !== null;
  var videoEl = null;
  var imgEl = null;

  if (isVideo) {
    videoEl = mediaEl;
  } else if (isVideoPreview) {
    videoEl = mediaEl.closest(".video-preview").querySelector("video");
    if (!videoEl) {
      imgEl = mediaEl.closest(".video-preview").querySelector("img");
    }
  } else {
    imgEl = mediaEl;
  }

  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";

  var closeBtn = document.createElement("button");
  closeBtn.className = "lightbox-close";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeLightbox();
  });

  var content = document.createElement("div");
  content.className = "lightbox-content";

  if (videoEl) {
    var clonedVideo = videoEl.cloneNode(true);
    clonedVideo.controls = true;
    clonedVideo.style.maxWidth = "90vw";
    clonedVideo.style.maxHeight = "90vh";
    content.appendChild(clonedVideo);
  } else if (imgEl) {
    var clonedImg = document.createElement("img");
    clonedImg.src = imgEl.src;
    clonedImg.alt = imgEl.alt || "";
    content.appendChild(clonedImg);
  } else {
    return;
  }

  if (!gIsAuthor) {
    var watermark = document.createElement("div");
    watermark.className = "lightbox-watermark";
    watermark.style.backgroundImage = "url(" + getWatermarkDataUrl() + ")";
    content.appendChild(watermark);
  }

  overlay.appendChild(closeBtn);
  overlay.appendChild(content);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeLightbox();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  var overlay = document.querySelector(".lightbox-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
}

// === 封面裁切 ===
function openCoverCrop(card, newCoverUrl) {
  var projectId = card.getAttribute("data-project-id");
  var project = allProjects[projectId];
  if (!project) return;

  var coverUrl = newCoverUrl || project.coverUrl || (project.images && project.images.length ? project.images[0].url : null);
  if (!coverUrl) return;

  var currentPos = project.coverPosition != null ? project.coverPosition : 50;
  var currentZoom = project.coverZoom != null ? project.coverZoom : 1;

  function applyPreview(img, pos, zoom) {
    img.style.objectPosition = "50% " + pos + "%";
    img.style.transform = "scale(" + zoom + ")";
    img.style.transformOrigin = "50% 50%";
  }

  var overlay = document.createElement("div");
  overlay.className = "crop-overlay";

  var dialog = document.createElement("div");
  dialog.className = "crop-dialog";

  var title = document.createElement("h3");
  title.textContent = "调整封面裁切";
  var hint = document.createElement("p");
  hint.className = "crop-hint";
  hint.textContent = "拖动滑块调整可见区域和缩放比例";

  // 16:9 预览框
  var previewBox = document.createElement("div");
  previewBox.className = "crop-preview";
  var previewImg = document.createElement("img");
  previewImg.src = coverUrl;
  applyPreview(previewImg, currentPos, currentZoom);
  previewBox.appendChild(previewImg);

  // 位置滑块
  var posRow = document.createElement("div");
  posRow.className = "crop-slider-row";
  var posLabel = document.createElement("span");
  posLabel.className = "crop-slider-label";
  posLabel.textContent = "位置";
  var posSlider = document.createElement("input");
  posSlider.type = "range";
  posSlider.min = 0;
  posSlider.max = 100;
  posSlider.value = currentPos;
  posSlider.className = "crop-slider";
  var posVal = document.createElement("span");
  posVal.className = "crop-pos-label";
  posVal.textContent = currentPos + "%";
  posRow.appendChild(posLabel);
  posRow.appendChild(posSlider);
  posRow.appendChild(posVal);

  posSlider.addEventListener("input", function () {
    var val = parseInt(posSlider.value, 10);
    applyPreview(previewImg, val, parseFloat(zoomSlider.value));
    posVal.textContent = val + "%";
  });

  // 缩放滑块
  var zoomRow = document.createElement("div");
  zoomRow.className = "crop-slider-row";
  var zoomLabel = document.createElement("span");
  zoomLabel.className = "crop-slider-label";
  zoomLabel.textContent = "缩放";
  var zoomSlider = document.createElement("input");
  zoomSlider.type = "range";
  zoomSlider.min = 1;
  zoomSlider.max = 3;
  zoomSlider.step = 0.05;
  zoomSlider.value = currentZoom;
  zoomSlider.className = "crop-slider";
  var zoomVal = document.createElement("span");
  zoomVal.className = "crop-pos-label";
  zoomVal.textContent = currentZoom + "x";
  zoomRow.appendChild(zoomLabel);
  zoomRow.appendChild(zoomSlider);
  zoomRow.appendChild(zoomVal);

  zoomSlider.addEventListener("input", function () {
    var val = parseFloat(zoomSlider.value);
    applyPreview(previewImg, parseInt(posSlider.value, 10), val);
    zoomVal.textContent = val.toFixed(2) + "x";
  });

  // 按钮
  var btnRow = document.createElement("div");
  btnRow.className = "crop-btn-row";

  var cancelBtn = document.createElement("button");
  cancelBtn.textContent = "取消";
  cancelBtn.addEventListener("click", function () {
    overlay.remove();
  });

  var okBtn = document.createElement("button");
  okBtn.textContent = "确定";
  okBtn.className = "crop-ok-btn";
  okBtn.addEventListener("click", function () {
    var pos = parseInt(posSlider.value, 10);
    var zoom = parseFloat(zoomSlider.value);
    project.coverPosition = pos;
    project.coverZoom = zoom;
    allProjects[projectId] = project;
    persistProjectToDB(projectId);
    applyCardCover(card, pos, zoom);
    overlay.remove();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(okBtn);

  dialog.appendChild(title);
  dialog.appendChild(hint);
  dialog.appendChild(previewBox);
  dialog.appendChild(posRow);
  dialog.appendChild(zoomRow);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function applyCardCover(card, pos, zoom) {
  var img = card.querySelector(".card-media > img");
  if (!img) return;
  img.style.objectPosition = "50% " + pos + "%";
  img.style.transform = "scale(" + zoom + ")";
  img.style.transformOrigin = "50% 50%";
}

// === 设置菜单 ===
function createSettingsMenu(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var oldIcon = cardMedia.querySelector(".card-settings");
  if (oldIcon) oldIcon.remove();
  var oldMenu = cardMedia.querySelector(".settings-menu");
  if (oldMenu) oldMenu.remove();

  if (!gIsAuthor) return;

  var icon = document.createElement("button");
  icon.className = "card-settings";
  icon.innerHTML = "&#x2699;";
  icon.title = "设置";
  cardMedia.appendChild(icon);

  var menu = document.createElement("div");
  menu.className = "settings-menu";

  var editBtn = document.createElement("button");
  editBtn.textContent = "修改作品";
  editBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    editWork(card);
    menu.classList.remove("visible");
  });

  var coverBtn = document.createElement("button");
  coverBtn.textContent = "换封面";
  coverBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    changeCover(card);
    menu.classList.remove("visible");
  });

  var cropBtn = null;
  // 图文项目才显示封面裁切
  if (card.classList.contains("project-card")) {
    cropBtn = document.createElement("button");
    cropBtn.textContent = "封面裁切";
    cropBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openCoverCrop(card);
      menu.classList.remove("visible");
    });
  }

  var deleteBtn = document.createElement("button");
  deleteBtn.textContent = "删除作品";
  deleteBtn.className = "danger";
  deleteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    deleteWork(card);
    menu.classList.remove("visible");
  });

  menu.appendChild(editBtn);
  menu.appendChild(coverBtn);
  if (cropBtn) menu.appendChild(cropBtn);
  menu.appendChild(deleteBtn);
  cardMedia.appendChild(menu);

  icon.addEventListener("click", function (e) {
    e.stopPropagation();
    var allMenus = document.querySelectorAll(".settings-menu.visible");
    allMenus.forEach(function (m) { m.classList.remove("visible"); });
    menu.classList.toggle("visible");
  });
}

document.addEventListener("click", function () {
  var allMenus = document.querySelectorAll(".settings-menu.visible");
  allMenus.forEach(function (m) { m.classList.remove("visible"); });
});

function refreshCardSettings() {
  var cards = document.querySelectorAll(".card");
  cards.forEach(function (card) {
    createSettingsMenu(card);
    setCardEditable(card, gIsAuthor);
  });
}

// === 删除作品 ===
function deleteWork(card) {
  if (!confirm("确定要删除这个作品吗？此操作不可撤销。")) return;
  var workId = card.getAttribute("data-work-id") || card.getAttribute("data-project-id");
  var projectId = card.getAttribute("data-project-id");
  card.remove();
  if (workId) {
    deleteWorkFromDB(workId).catch(function () {});
  }
  if (projectId) {
    delete allProjects[projectId];
  }
}

// === 卡片文字可编辑 ===
function setCardEditable(card, enabled) {
  var title = card.querySelector(".card-body h3");
  var desc = card.querySelector(".card-body p");
  if (title) title.contentEditable = enabled ? "true" : "false";
  if (desc) desc.contentEditable = enabled ? "true" : "false";
}

function editWork(card) {
  var projectId = card.getAttribute("data-project-id");
  if (projectId) {
    getProjectData(projectId).then(function (data) {
      if (data) openProjectDetail(projectId);
    });
    return;
  }
  var title = card.querySelector(".card-body h3");
  if (title) {
    title.classList.add("editing");
    title.focus();
    title.addEventListener("blur", function () {
      title.classList.remove("editing");
    }, { once: true });
  }
}

// === 换封面 ===
function changeCover(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var isVideo = cardMedia.querySelector(".video-preview") !== null;

  var input = document.createElement("input");
  input.type = "file";
  input.accept = isVideo ? "video/*" : "image/*";

  input.addEventListener("change", function () {
    if (!input.files || !input.files.length) return;
    var file = input.files[0];
    var url = URL.createObjectURL(file);

    if (isVideo) {
      var videoEl = cardMedia.querySelector("video");
      if (videoEl) {
        videoEl.src = url;
      }
    } else {
      var imgEl = cardMedia.querySelector("img");
      if (imgEl) {
        imgEl.src = url;
      }
    }

    // 更新 IndexedDB 中的文件数据
    var workId = card.getAttribute("data-work-id");
    if (workId) {
      updateWorkInDB(workId, { fileData: file, fileName: file.name }).catch(function () {});
    }
    var projectId = card.getAttribute("data-project-id");
    if (projectId && allProjects[projectId]) {
      allProjects[projectId].coverFileData = file;
      allProjects[projectId].images[0] = { url: url, fileName: file.name, fileData: file };
      allProjects[projectId].coverUrl = url;
      updateWorkInDB(projectId, { coverFileData: file }).catch(function () {});
      // 弹出裁切对话框
      openCoverCrop(card, url);
      return;
    }

    bindCardClick(card);
  });

  input.click();
}

// === 编辑内容持久化 ===
function persistCardEdit(card) {
  var title = card.querySelector(".card-body h3");
  var desc = card.querySelector(".card-body p");
  var titleText = title ? title.textContent : "";
  var descText = desc ? desc.textContent : "";

  var workId = card.getAttribute("data-work-id");
  if (workId) {
    updateWorkInDB(workId, {
      title: titleText,
      description: descText
    }).catch(function () {});
  }

  var projectId = card.getAttribute("data-project-id");
  if (projectId && allProjects[projectId]) {
    allProjects[projectId].title = titleText;
    allProjects[projectId].brief = descText;
    updateWorkInDB(projectId, {
      title: titleText,
      brief: descText
    }).catch(function () {});
  }
}

// === 卡片点击绑定 ===
function bindCardClick(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var newMedia = cardMedia.cloneNode(true);
  cardMedia.parentNode.replaceChild(newMedia, cardMedia);

  createSettingsMenu(card);

  var isProject = card.classList.contains("project-card");
  var projectId = card.getAttribute("data-project-id");

  newMedia.addEventListener("click", function (e) {
    if (e.target.closest(".card-settings") || e.target.closest(".settings-menu")) {
      return;
    }
    if (isProject && projectId) {
      getProjectData(projectId).then(function (data) {
        if (data) openProjectDetail(projectId);
      });
    } else {
      var media = newMedia.querySelector("video") || newMedia.querySelector("img");
      if (media) openLightbox(media);
    }
  });
}

// === 初始化所有卡片 ===
function initAllCards() {
  var cards = document.querySelectorAll(".card");
  cards.forEach(function (card) {
    ensureCardMedia(card);
    createSettingsMenu(card);
    setCardEditable(card, gIsAuthor);
    bindCardClick(card);
  });
}

function ensureCardMedia(card) {
  if (card.querySelector(".card-media")) return;

  var media = card.querySelector(".video-preview") || card.querySelector("img");
  if (!media) return;

  var wrapper = document.createElement("div");
  wrapper.className = "card-media";

  while (card.firstElementChild && !card.firstElementChild.classList.contains("card-body")) {
    wrapper.appendChild(card.firstElementChild);
  }
  card.insertBefore(wrapper, card.firstElementChild);
}

// === 作品上传（持久化到 IndexedDB） ===
function addVideoWork(file) {
  if (!videoGrid) return;
  var workId = generateWorkId();
  var url = URL.createObjectURL(file);
  var mediaHTML = '<div class="video-preview"><video src="' + url + '" preload="metadata" muted></video></div>';
  var card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-work-id", workId);
  card.innerHTML =
    '<div class="card-media">' + mediaHTML + '</div>' +
    '<div class="card-body">' +
    '<h3>' + file.name + '</h3>' +
    '<p>已上传的视频作品。</p>' +
    '</div>';
  videoGrid.prepend(card);
  initSingleCard(card);

  saveWorkToDB({
    id: workId,
    type: "video",
    fileName: file.name,
    fileData: file,
    title: file.name,
    description: "已上传的视频作品。",
    createdAt: Date.now()
  }).then(function () {
    window.alert("视频「" + file.name + "」已保存成功。");
  }).catch(function () {
    window.alert("保存失败，请重试。");
  });
}

function initSingleCard(card) {
  createSettingsMenu(card);
  setCardEditable(card, gIsAuthor);
  bindCardClick(card);
}

function uploadVideo() {
  if (!videoFileInput || !videoFileInput.files.length) {
    window.alert("请选择一个视频文件后再上传。");
    return;
  }
  addVideoWork(videoFileInput.files[0]);
  videoFileInput.value = "";
}

// === 图文项目上传 ===
function uploadProject() {
  if (!projectImagesInput || !projectImagesInput.files.length) {
    window.alert("请至少选择一张图片。");
    return;
  }
  var title = projectTitleInput.value.trim() || "未命名项目";
  var brief = projectBriefInput.value.trim();
  var timeline = projectTimelineInput.value.trim();
  var content = projectContentInput.value.trim();
  var results = projectResultsInput.value.trim();

  var files = Array.from(projectImagesInput.files);
  var projectId = generateWorkId();
  var images = [];
  var coverFileData = files[0];

  files.forEach(function (file) {
    images.push({ url: URL.createObjectURL(file), fileName: file.name });
  });

  var project = {
    id: projectId,
    type: "image-project",
    title: title,
    brief: brief,
    images: images,
    timeline: timeline,
    content: content,
    results: results,
    coverFileData: coverFileData,
    createdAt: Date.now()
  };

  allProjects[projectId] = project;
  renderProjectCard(project);
  initSingleCard(imageGrid.querySelector('.project-card[data-project-id="' + projectId + '"]'));

  var dbProject = {
    id: projectId,
    type: "image-project",
    title: title,
    brief: brief,
    images: files.map(function (f) { return { fileName: f.name, fileData: f }; }),
    timeline: timeline,
    content: content,
    results: results,
    coverFileData: coverFileData,
    createdAt: Date.now()
  };
  saveWorkToDB(dbProject).then(function () {
    window.alert("项目「" + title + "」已保存成功，可以刷新页面了。");
  }).catch(function () {
    window.alert("保存失败，请重试。");
  });

  projectTitleInput.value = "";
  projectBriefInput.value = "";
  projectImagesInput.value = "";
  projectTimelineInput.value = "";
  projectContentInput.value = "";
  projectResultsInput.value = "";
}

function getBaseUrl() {
  if (BASE_SITE_URL) {
    return BASE_SITE_URL.replace(/\/index\.html$|\/$/, "/index.html");
  }
  if (window.location.protocol.startsWith("http")) {
    return window.location.origin + window.location.pathname;
  }
  return window.location.href.split("?")[0].split("#")[0];
}

// === 事件绑定 ===
if (deauthButton) deauthButton.addEventListener("click", deauthorizeDevice);
if (uploadBannerButton) uploadBannerButton.addEventListener("click", uploadBanner);
if (removeBannerButton) removeBannerButton.addEventListener("click", removeBanner);
if (uploadFooterBannerBtn) uploadFooterBannerBtn.addEventListener("click", uploadFooterBanner);
if (removeFooterBannerBtn) removeFooterBannerBtn.addEventListener("click", removeFooterBanner);
if (uploadVideoButton) uploadVideoButton.addEventListener("click", uploadVideo);
if (uploadProjectButton) uploadProjectButton.addEventListener("click", uploadProject);

document.addEventListener("focusin", function (e) {
  if (e.target.closest(".card-body") && e.target.isContentEditable) {
    e.target.classList.add("editing");
  }
});

document.addEventListener("focusout", function (e) {
  if (e.target.closest(".card-body") && e.target.isContentEditable) {
    e.target.classList.remove("editing");
    // 持久化编辑内容到 IndexedDB
    var card = e.target.closest(".card");
    if (card) persistCardEdit(card);
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeLightbox();
    closeProjectDetail();
  }
});

window.addEventListener("load", authorizePage);
window.addEventListener("hashchange", authorizePage);
