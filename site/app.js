/**
 * Todo 清单（纯 JavaScript）
 *
 * 设计目标：
 * - 代码尽量清晰、好维护：把“状态管理 / 存储 / 渲染 / 事件”拆开
 * - 尽量复用：通用工具函数（id、存储、下载、提示）集中管理
 * - 兼容 GitHub Pages：纯静态资源，不依赖构建工具
 */

(() => {
  "use strict";

  /**
   * =========================
   * 1) 常量与工具函数
   * =========================
   */

  const STORAGE_KEY = "simple_todo_app_v1";
  const MAX_TODO_LENGTH = 120;

  /**
   * 生成一个足够用的 ID（不追求密码学强度）。
   * - 优先使用 crypto.randomUUID（现代浏览器）
   * - 否则回退到时间戳 + 随机数
   */
  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * 安全 JSON 解析：失败则返回 null。
   */
  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * 简易 toast：用 alert 替代复杂 UI（保持零依赖）
   */
  function toast(message) {
    // 对于简单 demo，用 alert 足够直观
    // eslint-disable-next-line no-alert
    alert(message);
  }

  /**
   * 触发下载（导出 JSON）
   */
  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * =========================
   * 2) 数据模型与存储层
   * =========================
   *
   * Todo 模型：
   * {
   *   id: string,
   *   text: string,
   *   done: boolean,
   *   createdAt: number (ms)
   * }
   */

  function loadTodos() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return [];

    // 进行一次轻量校验，避免脏数据影响渲染
    return parsed
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : createId(),
        text: typeof t.text === "string" ? t.text.slice(0, MAX_TODO_LENGTH) : "",
        done: Boolean(t.done),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now()
      }))
      .filter((t) => t.text.trim().length > 0);
  }

  function saveTodos(todos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  /**
   * =========================
   * 3) 状态管理（单一状态源）
   * =========================
   */

  const state = {
    todos: loadTodos(),
    filter: "all", // all | active | done
    keyword: ""
  };

  /**
   * 统一更新状态并触发渲染（避免到处散落 render 调用）。
   */
  function setState(patch) {
    Object.assign(state, patch);
    saveTodos(state.todos);
    render();
  }

  /**
   * =========================
   * 4) 视图渲染
   * =========================
   */

  const el = {
    addForm: document.getElementById("addForm"),
    newTodoInput: document.getElementById("newTodoInput"),
    searchInput: document.getElementById("searchInput"),
    stats: document.getElementById("stats"),
    todoList: document.getElementById("todoList"),
    clearDoneBtn: document.getElementById("clearDoneBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importFile: document.getElementById("importFile"),
    filterButtons: Array.from(document.querySelectorAll("[data-filter]")),
    todoItemTpl: document.getElementById("todoItemTpl")
  };

  /**
   * 根据状态得到当前需要展示的 todos（筛选 + 搜索）。
   */
  function selectVisibleTodos() {
    const keyword = state.keyword.trim().toLowerCase();

    return state.todos.filter((t) => {
      const matchesFilter =
        state.filter === "all" ? true : state.filter === "active" ? !t.done : t.done;
      const matchesKeyword = keyword.length === 0 ? true : t.text.toLowerCase().includes(keyword);
      return matchesFilter && matchesKeyword;
    });
  }

  function renderStats() {
    const total = state.todos.length;
    const done = state.todos.filter((t) => t.done).length;
    const active = total - done;

    el.stats.textContent = `总计 ${total} 项 · 进行中 ${active} · 已完成 ${done}`;
    el.clearDoneBtn.disabled = done === 0;
  }

  function renderFilters() {
    el.filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === state.filter;
      btn.classList.toggle("active", isActive);
    });
  }

  /**
   * 构建单个 Todo 节点（使用 template，避免拼字符串产生 XSS 风险）。
   */
  function buildTodoItemNode(todo) {
    const node = el.todoItemTpl.content.firstElementChild.cloneNode(true);

    node.dataset.id = todo.id;
    node.classList.toggle("done", todo.done);

    const toggle = node.querySelector(".toggle");
    const text = node.querySelector(".text");

    toggle.checked = todo.done;
    text.textContent = todo.text;

    return node;
  }

  function renderList() {
    const visibleTodos = selectVisibleTodos();

    // 使用 DocumentFragment 可以减少 reflow
    const frag = document.createDocumentFragment();
    visibleTodos
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((todo) => frag.appendChild(buildTodoItemNode(todo)));

    el.todoList.replaceChildren(frag);
  }

  function render() {
    renderStats();
    renderFilters();
    renderList();
  }

  /**
   * =========================
   * 5) 事件绑定
   * =========================
   */

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_TODO_LENGTH) {
      toast(`任务内容最多 ${MAX_TODO_LENGTH} 个字符`);
      return;
    }

    const todo = {
      id: createId(),
      text: trimmed,
      done: false,
      createdAt: Date.now()
    };

    setState({ todos: [todo, ...state.todos] });
  }

  function toggleTodo(id, done) {
    const next = state.todos.map((t) => (t.id === id ? { ...t, done } : t));
    setState({ todos: next });
  }

  function deleteTodo(id) {
    const next = state.todos.filter((t) => t.id !== id);
    setState({ todos: next });
  }

  function clearDone() {
    const next = state.todos.filter((t) => !t.done);
    setState({ todos: next });
  }

  function exportTodos() {
    const payload = {
      exportedAt: new Date().toISOString(),
      todos: state.todos
    };
    const filename = `todos_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    downloadTextFile(filename, JSON.stringify(payload, null, 2));
  }

  async function importTodosFromFile(file) {
    const text = await file.text();
    const parsed = safeJsonParse(text);

    // 兼容两种格式：
    // 1) { todos: [...] }（本应用导出格式）
    // 2) [...]（纯数组）
    const rawTodos = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.todos) ? parsed.todos : null;
    if (!rawTodos) {
      toast("导入失败：不是合法的 JSON Todo 数据。");
      return;
    }

    const normalized = rawTodos
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : createId(),
        text: typeof t.text === "string" ? t.text.slice(0, MAX_TODO_LENGTH) : "",
        done: Boolean(t.done),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now()
      }))
      .filter((t) => t.text.trim().length > 0);

    if (normalized.length === 0) {
      toast("导入失败：没有可用的任务数据。");
      return;
    }

    // 合并策略：按 id 去重，保留“已有的”，追加“新的”
    const seen = new Set(state.todos.map((t) => t.id));
    const merged = [...state.todos];
    normalized.forEach((t) => {
      if (!seen.has(t.id)) merged.push(t);
    });

    setState({ todos: merged });
    toast(`导入成功：新增 ${merged.length - state.todos.length} 条任务。`);
  }

  // 新增任务
  el.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(el.newTodoInput.value);
    el.newTodoInput.value = "";
    el.newTodoInput.focus();
  });

  // 搜索
  el.searchInput.addEventListener("input", (e) => {
    setState({ keyword: e.target.value });
  });

  // 筛选
  el.filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setState({ filter: btn.dataset.filter });
    });
  });

  // 列表事件委托（toggle / delete）
  el.todoList.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const todoItem = target.closest(".todo");
    if (!todoItem) return;

    const id = todoItem.dataset.id;
    if (!id) return;

    // 删除按钮
    if (target.classList.contains("delete")) {
      deleteTodo(id);
      return;
    }

    // checkbox
    if (target.classList.contains("toggle") && target instanceof HTMLInputElement) {
      toggleTodo(id, target.checked);
    }
  });

  // 清空已完成
  el.clearDoneBtn.addEventListener("click", () => clearDone());

  // 导出
  el.exportBtn.addEventListener("click", () => exportTodos());

  // 导入
  el.importFile.addEventListener("change", async (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;

    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast("请选择 .json 文件");
      input.value = "";
      return;
    }

    try {
      await importTodosFromFile(file);
    } catch {
      toast("导入失败：读取文件出错。");
    } finally {
      // 允许重复导入同一个文件
      input.value = "";
    }
  });

  /**
   * =========================
   * 6) 首次渲染
   * =========================
   */

  render();
})();

