const projectDialog = document.querySelector("#projectDialog");
const projectForm = document.querySelector("#projectForm");
const newProjectBtn = document.querySelector("#newProjectBtn");
const sampleDataBtn = document.querySelector("#sampleDataBtn");
const detailTitle = document.querySelector("#detailTitle");
const detailMeta = document.querySelector("#detailMeta");
const detailStatus = document.querySelector("#detailStatus");
const scheduleUpload = document.querySelector("#scheduleUpload");
const addTaskBtn = document.querySelector("#addTaskBtn");
const taskRows = document.querySelector("#taskRows");
const overallProgressLabel = document.querySelector("#overallProgressLabel");
const overallProgressBar = document.querySelector("#overallProgressBar");

const columnMap = {
  backlog: document.querySelector("#column-backlog"),
  "in-progress": document.querySelector("#column-in-progress"),
  done: document.querySelector("#column-done"),
};

const countMap = {
  backlog: document.querySelector("#count-backlog"),
  "in-progress": document.querySelector("#count-in-progress"),
  done: document.querySelector("#count-done"),
};

const state = {
  projects: [],
  selectedId: null,
};

const statusLabel = {
  backlog: "Backlog",
  "in-progress": "En progreso",
  done: "Completado",
};

const defaultTasks = [
  {
    name: "Planeación y alcance",
    start: "2024-09-02",
    end: "2024-09-10",
    wbs: "1.1",
    weight: 2,
    progress: 65,
  },
  {
    name: "Diseño de solución",
    start: "2024-09-11",
    end: "2024-09-20",
    wbs: "1.2",
    weight: 3,
    progress: 45,
  },
  {
    name: "Implementación",
    start: "2024-09-21",
    end: "2024-10-10",
    wbs: "1.3",
    weight: 5,
    progress: 30,
  },
];

const sampleProjects = [
  {
    id: "prj-1",
    name: "Migración CRM",
    owner: "Equipo Digital",
    description: "Consolidar clientes y procesos en la nueva plataforma.",
    status: "in-progress",
    tasks: structuredClone(defaultTasks),
  },
  {
    id: "prj-2",
    name: "Campus de datos",
    owner: "BI & Analytics",
    description: "Lago de datos con indicadores estratégicos.",
    status: "backlog",
    tasks: [],
  },
  {
    id: "prj-3",
    name: "App de mantenimiento",
    owner: "Operaciones",
    description: "Aplicación móvil para seguimiento de órdenes.",
    status: "done",
    tasks: [
      {
        name: "Entrega MVP",
        start: "2024-06-01",
        end: "2024-07-15",
        wbs: "2.1",
        weight: 4,
        progress: 100,
      },
    ],
  },
];

const createId = () => `prj-${crypto.randomUUID()}`;

const clampProgress = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, numeric));
};

const parseCsv = (text) => {
  const rows = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0].split(",").map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const values = row.split(",");
    const lookup = (key) => {
      const index = headers.findIndex((header) => header.includes(key));
      return index >= 0 ? values[index]?.trim() : "";
    };
    return {
      name: lookup("task") || lookup("name") || "",
      start: lookup("start"),
      end: lookup("finish") || lookup("end"),
      wbs: lookup("wbs"),
      weight: Number(lookup("weight")) || 1,
      progress: clampProgress(lookup("progress") || lookup("percent")),
    };
  });
};

const renderBoard = () => {
  Object.values(columnMap).forEach((column) => {
    column.innerHTML = "";
  });

  const counts = { backlog: 0, "in-progress": 0, done: 0 };

  state.projects.forEach((project) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "project-card";
    card.dataset.projectId = project.id;
    card.innerHTML = `
      <div class="card-title">
        <div>
          <h3>${project.name}</h3>
          <p class="muted">${project.owner}</p>
        </div>
        <span class="badge">${statusLabel[project.status]}</span>
      </div>
      <p>${project.description || "Sin descripción por ahora."}</p>
      <div class="project-meta">
        <span>Tareas: ${project.tasks.length}</span>
        <span>Avance: ${Math.round(calculateOverallProgress(project.tasks))}%</span>
      </div>
    `;
    card.addEventListener("click", () => selectProject(project.id));
    columnMap[project.status].appendChild(card);
    counts[project.status] += 1;
  });

  Object.entries(counts).forEach(([status, count]) => {
    countMap[status].textContent = count;
  });
};

const renderDetail = () => {
  const project = state.projects.find((item) => item.id === state.selectedId);
  if (!project) {
    detailTitle.textContent = "Selecciona un proyecto";
    detailMeta.textContent = "Para comenzar, haz clic en una tarjeta.";
    detailStatus.value = "backlog";
    detailStatus.disabled = true;
    scheduleUpload.disabled = true;
    addTaskBtn.disabled = true;
    taskRows.innerHTML = "";
    updateOverallProgress([]);
    return;
  }

  detailTitle.textContent = project.name;
  detailMeta.textContent = `${project.owner} · ${project.description || "Sin descripción"}`;
  detailStatus.disabled = false;
  detailStatus.value = project.status;
  scheduleUpload.disabled = false;
  addTaskBtn.disabled = false;
  renderTasks(project);
  updateOverallProgress(project.tasks);
};

const updateOverallProgress = (tasks) => {
  const progress = calculateOverallProgress(tasks);
  overallProgressLabel.textContent = `Avance global: ${Math.round(progress)}%`;
  overallProgressBar.style.width = `${progress}%`;
};

const calculateOverallProgress = (tasks) => {
  if (!tasks.length) {
    return 0;
  }
  const totalWeight = tasks.reduce((sum, task) => sum + (Number(task.weight) || 1), 0);
  const weighted = tasks.reduce(
    (sum, task) => sum + (Number(task.weight) || 1) * clampProgress(task.progress),
    0
  );
  return totalWeight ? weighted / totalWeight : 0;
};

const renderTasks = (project) => {
  taskRows.innerHTML = "";
  project.tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `
      <input type="text" value="${task.name}" data-field="name" />
      <input type="date" value="${task.start}" data-field="start" />
      <input type="date" value="${task.end}" data-field="end" />
      <input type="text" value="${task.wbs}" data-field="wbs" />
      <input type="number" min="1" value="${task.weight}" data-field="weight" />
      <input type="number" min="0" max="100" value="${task.progress}" data-field="progress" />
      <button type="button" class="icon-btn" aria-label="Eliminar">✕</button>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (event) => {
        const field = event.target.dataset.field;
        project.tasks[index][field] = field === "progress" ? clampProgress(event.target.value) : event.target.value;
        updateOverallProgress(project.tasks);
        renderBoard();
      });
    });

    row.querySelector("button").addEventListener("click", () => {
      project.tasks.splice(index, 1);
      renderTasks(project);
      updateOverallProgress(project.tasks);
      renderBoard();
    });

    taskRows.appendChild(row);
  });

  if (!project.tasks.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Agrega tareas manualmente o sube un cronograma.";
    taskRows.appendChild(empty);
  }
};

const selectProject = (id) => {
  state.selectedId = id;
  renderDetail();
};

const addTask = () => {
  const project = state.projects.find((item) => item.id === state.selectedId);
  if (!project) {
    return;
  }
  project.tasks.push({
    name: "Nueva tarea",
    start: "",
    end: "",
    wbs: "",
    weight: 1,
    progress: 0,
  });
  renderTasks(project);
  updateOverallProgress(project.tasks);
  renderBoard();
};

newProjectBtn.addEventListener("click", () => {
  projectDialog.showModal();
});

sampleDataBtn.addEventListener("click", () => {
  state.projects = structuredClone(sampleProjects);
  renderBoard();
  selectProject(state.projects[0]?.id ?? null);
});

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(projectForm);
  const project = {
    id: createId(),
    name: formData.get("name"),
    owner: formData.get("owner"),
    description: formData.get("description"),
    status: formData.get("status"),
    tasks: [],
  };
  state.projects.push(project);
  projectDialog.close();
  projectForm.reset();
  renderBoard();
  selectProject(project.id);
});

projectDialog.addEventListener("click", (event) => {
  const dialogRect = projectDialog.getBoundingClientRect();
  const clickedInDialog =
    event.clientX >= dialogRect.left &&
    event.clientX <= dialogRect.right &&
    event.clientY >= dialogRect.top &&
    event.clientY <= dialogRect.bottom;
  if (!clickedInDialog) {
    projectDialog.close();
  }
});

detailStatus.addEventListener("change", (event) => {
  const project = state.projects.find((item) => item.id === state.selectedId);
  if (!project) {
    return;
  }
  project.status = event.target.value;
  renderBoard();
});

addTaskBtn.addEventListener("click", addTask);

scheduleUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const tasks = parseCsv(reader.result);
    const project = state.projects.find((item) => item.id === state.selectedId);
    if (!project) {
      return;
    }
    project.tasks = tasks.filter((task) => task.name !== "");
    renderTasks(project);
    updateOverallProgress(project.tasks);
    renderBoard();
  };
  reader.readAsText(file);
});

renderBoard();
renderDetail();
