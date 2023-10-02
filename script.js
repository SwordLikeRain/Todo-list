document.addEventListener("DOMContentLoaded", function () {
  const newTodoInput = document.getElementById("newTodo");
  const addTodoButton = document.getElementById("addTodo");
  const todoList = document.getElementById("todoList");
  const filterButtons = document.querySelectorAll('input[name="filter"]');

  const todos = [];

  addTodoButton.addEventListener("click", function () {
    const todoText = newTodoInput.value;
    if (todoText.trim() !== "") {
      const todo = {
        text: todoText,
        status: "unfinished",
      };
      todos.push(todo);
      newTodoInput.value = "";
      renderTodoList();
    }
  });

  function renderTodoList() {
    todoList.innerHTML = "";
    const selectedFilter = document.querySelector(
      'input[name="filter"]:checked'
    ).value;
    todos.forEach((todo, index) => {
      if (selectedFilter === "all" || selectedFilter === todo.status) {
        const listItem = document.createElement("li");
        const toggleButton = document.createElement("button");
        toggleButton.textContent = "Toggle";
        toggleButton.addEventListener("click", () => toggleTodoStatus(index));
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTodo(index));
        const todoText = document.createElement("span");
        todoText.textContent = todo.text;
        todoText.addEventListener("dblclick", () => editTodoText(index));

        listItem.appendChild(toggleButton);
        listItem.appendChild(todoText);
        listItem.appendChild(deleteButton);
        todoList.appendChild(listItem);
      }
    });
  }

  function toggleTodoStatus(index) {
    const todo = todos[index];
    switch (todo.status) {
      case "completed":
        todo.status = "unfinished";
        break;
      case "unfinished":
        todo.status = "inprogress";
        break;
      case "inprogress":
        todo.status = "completed";
        break;
    }
    renderTodoList();
  }

  function deleteTodo(index) {
    todos.splice(index, 1);
    renderTodoList();
  }

  function editTodoText(index) {
    const todo = todos[index];
    const newText = prompt("Edit Todo", todo.text);
    if (newText !== null) {
      todo.text = newText;
      renderTodoList();
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("change", renderTodoList);
  });

  renderTodoList();
});
