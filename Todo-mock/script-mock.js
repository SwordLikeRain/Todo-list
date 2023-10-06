/*=======================初始化相关==========================*/
const storeName = "ToDoLists";
let lists = [
    {
        name: "Default List",
        tasks: [],
    },
];
let currentListIndex = 0;
let filterStatus = "all";
let database = null;

// 使用Promise确保 mock.js 和 axios.js 加载完成
loadScript("https://cdn.bootcdn.net/ajax/libs/Mock.js/1.0.0/mock-min.js")
    .then(() => {
        console.log("Mock.js is loaded");

        return loadScript("https://cdn.bootcdn.net/ajax/libs/axios/1.3.6/axios.js");
    })
    .then(() => {
        console.log("axios is loaded");

        configureMock();

        // 二选一, 分别对应测试无数据库初始化和有数据库初始化的情况
        if (Math.floor(Math.random() * 100) % 2 === 1) {
            console.log("使用默认数据, 模拟建表");
            renderLists();
        } else {
            getAllDataFromDB(database, storeName)
                .then((contents) => {
                    lists = contents;
                    console.log("初始化数据成功");
                    renderLists();
                })
                .catch((error) => {
                    console.error("初始化数据错误" + error);
                });
        }
    })
    .catch((error) => {
        console.error("Error loading libraries: ", error);
    });

/**
 * 加载外部JavaScript脚本文件。
 * @param {string} src - 要加载的脚本文件的URL。
 * @returns {Promise} - 返回一个Promise，当脚本成功加载时解析，加载失败时拒绝。
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

/*=================待办列表(List)相关的函数===================*/

/**
 * 创建新列表并自动切换到新列表展示
 */
function createNewList() {
    const newListName = prompt("请输入列表名称:");
    if (newListName === null || newListName.trim() === "") {
        alert("列表名不合法, 请重新输入");
        return;
    }

    const newList = {
        name: newListName,
        tasks: [],
    };
    lists.push(newList);
    currentListIndex = lists.length - 1; // 切换到新建列表
    renderLists();
}

/**
 * 修改当前展示的列表名
 * 无法删除最后一个列表
 */
function editCurrentListName() {
    const curName = lists[currentListIndex].name;
    const newListName = prompt("请输入列表名称:", curName);
    if (newListName === null || newListName.trim() === "") {
        alert("列表名不合法, 请重新输入");
        return;
    }

    deleteListFromDB(database, storeName, curName)
        .then(() => {
            lists[currentListIndex].name = newListName;
            renderLists();
        })
        .catch(() => {
            alert("编辑列表名时发生错误");
        });
}

/**
 * 删除当前展示的列表
 * 无法删除最后一个列表
 */
function deleteCurrentList() {
    if (lists.length > 1) {
        deleteListFromDB(database, storeName, lists[currentListIndex].name)
            .then(() => {
                lists.splice(currentListIndex, 1);
                currentListIndex = lists.length - 1;
                renderLists();
            })
            .catch(() => {
                alert("删除列表时发生错误");
            });
    } else {
        alert("最后一个列表无法被删除");
    }
}

/**
 * 切换列表为所选列表
 * @param {event} event 触发事件
 */
function switchCurrentList(event) {
    currentListIndex = parseInt(event.target.value);
    renderLists();
}


/*=================待办事项(Task)相关的函数===================*/

/**
 * 新增待办事项内容, Enter结束输入
 * @param {event} event 触发事件
 */
function addTask(event) {
    if (event.key === "Enter") {
        const taskText = document.getElementById("addTask").value;
        if (taskText.trim() === "") {
            return;
        }
        const task = {
            status: "todo",
            content: taskText,
        };
        lists[currentListIndex].tasks.push(task);
        document.getElementById("addTask").value = "";
        renderTasks();
    }
}

/**
 * 编辑所选待办事项内容, 双击触发
 * 触发后, 待办事项内容变为可编辑状态
 * 编辑后如果发现输入为空, 则还原修改前内容并提示输入非法
 * @param {int} index 所选待办事项的序号
 * @param {event} event 触发事件
 */
function editTask(index, event) {
    const contentDiv = document.getElementById(`content-${index}`);
    const curContent = contentDiv.innerHTML; // 保存修改前内容
    contentDiv.setAttribute("contenteditable", true);
    contentDiv.focus();

    function handleBlur() {
        contentDiv.setAttribute("contenteditable", false);
        const taskText = contentDiv.innerHTML;
        if (taskText.trim() === "") {
            contentDiv.innerHTML = curContent; // 非法输入, 自动恢复修改前内容
            alert("名称非法, 请重新修改");
        } else {
            lists[currentListIndex].tasks[index].content = taskText;
            renderTasks();
        }
        contentDiv.removeEventListener("blur", handleBlur); // 移除监听器
    }

    contentDiv.addEventListener("blur", handleBlur);

    // 禁止事件冒泡以免删除显示错误
    event.stopPropagation();
}

/**
 * 删除所选待办事项
 * @param {int} index 所选待办事项的序号
 */
function deleteTask(index) {
    lists[currentListIndex].tasks.splice(index, 1);
    renderTasks();
}

/**
 * 修改所选待办事项的状态
 * @param {int} index 所选待办事项的序号
 * @param {object} selectElement 新状态
 */
function changeTaskStatus(index, selectElement) {
    lists[currentListIndex].tasks[index].status = selectElement.value;
    renderTasks();
}

/**
 * 更新筛选状态后应该显示的所有待办事项
 * @param {str} status 新的应该显示的状态
 */
function filterTasks(status) {
    filterStatus = status;
    renderTasks();
}


/*=================响应更新(render)相关的函数===================*/

/**
 * 更新列表筛选项的内容后, 调用renderTasks()
 * 1. 根据当前lists的内容, 更新listSelect列表筛选的条目
 * 2. 调用renderTasks()
 */
function renderLists() {
    const listSelect = document.getElementById("listSelect");
    listSelect.innerHTML = "";
    for (let i = 0; i < lists.length; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.text = lists[i].name;
        if (i === currentListIndex) {
            option.setAttribute("selected", true);
        }
        listSelect.appendChild(option);
    }
    renderTasks();
}

/**
 * 存储最新数据、更新统计信息+当前列表下的待办事项的界面显示
 * 1. 向从数据库存储最新的lists数据
 * 2. 根据当前lists的内容, 构建innerHTML, 同时进行数据统计
 * 3. 展示构建好的tasksDiv和统计结果
 */
function renderTasks() {
    // 1. 向从数据库存储最新数据
    for (const list of lists) {
        updateListToDB(database, storeName, list)
            .then((message) => {
                console.log(message);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    // *. 三个针对当前 List 的统计变量
    let toDoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;

    // *. 获取tasksDiv和当前要展示的currentTaskList
    const tasksDiv = document.getElementById("tasks");
    tasksDiv.innerHTML = "";
    const currentTaskList = lists[currentListIndex].tasks;

    let taskIdx = 1;
    for (let i = 0; i < currentTaskList.length; i++) {
        const task = currentTaskList[i];

        /* 2. 生成每项任务的 innerHTML, 保存在taskDiv下, 最后将taskDiv加入到tasksDiv */
        if (filterStatus === "all" || task.status === filterStatus) {
            // 2.1 生成当前task的taskDiv
            const taskDiv = document.createElement("div");
            taskDiv.classList.add("task-panel");

            // 2.2 生成展示序号的seqDiv
            const seqDiv = document.createElement("span");
            seqDiv.classList.add("task-seq");
            seqDiv.innerHTML = `${taskIdx}`;

            // 2.3 生成展示状态的statusDiv, 绑定了changeTaskStatus()函数
            const statusDiv = document.createElement("div");
            statusDiv.classList.add("task-status");
            statusDiv.innerHTML = `
                <select onchange="changeTaskStatus(${i}, this)" class="task-status-select-box">
                    <option value="todo" class="task-status-select-option" ${
                        task.status === "todo" ? "selected" : ""
                    }>未完成</option>
                    <option value="inProgress" class="task-status-select-option" ${
                        task.status === "inProgress" ? "selected" : ""
                    }>执行中</option>
                    <option value="done" class="task-status-select-option" ${
                        task.status === "done" ? "selected" : ""
                    }>已完成</option>
                </select>
            `;
            const selectElement = statusDiv.querySelector("select");
            switch (task.status) {
                case "todo":
                    selectElement.style.backgroundColor = "#ecc55a"; // 设置未完成的背景颜色
                    break;
                case "inProgress":
                    selectElement.style.backgroundColor = "#939afb"; // 设置执行中的背景颜色
                    break;
                case "done":
                    selectElement.style.backgroundColor = "#a9f2a9"; // 设置已完成的背景颜色
                    break;
                default:
                    selectElement.style.backgroundColor = ""; // 默认情况下清除背景颜色
            }

            // 2.4 生成展示事项内容的contentDiv, 绑定了editTask()函数
            const contentDiv = document.createElement("div");
            contentDiv.classList.add("task-content");
            contentDiv.innerHTML = task.content;
            contentDiv.id = `content-${i}`;
            contentDiv.addEventListener("dblclick", (event) =>
                editTask(i, event)
            );

            // 2.5 生成展示删除键的deleteDiv, 绑定了deleteTask()函数, 且会根据鼠标焦点位置更新显示状态
            const deleteDiv = document.createElement("div");
            deleteDiv.classList.add("task-delete");
            deleteDiv.innerHTML = "❌";
            deleteDiv.addEventListener("click", () => deleteTask(i));
            deleteDiv.addEventListener(
                "mouseenter",
                () => (deleteDiv.style.display = "block")
            );
            deleteDiv.addEventListener(
                "mouseleave",
                () => (deleteDiv.style.display = "none")
            );

            taskDiv.appendChild(seqDiv);
            taskDiv.appendChild(statusDiv);
            taskDiv.appendChild(contentDiv);
            taskDiv.appendChild(deleteDiv);
            tasksDiv.appendChild(taskDiv);
            taskIdx++;
        }

        // 2. 更新统计量
        if (task.status === "todo") {
            toDoCount++;
        } else if (task.status === "inProgress") {
            inProgressCount++;
        } else if (task.status === "done") {
            doneCount++;
        }
    }

    // 3. 展示统计结果
    const totalTasks = currentTaskList.length;
    document.getElementById("totalTasks").textContent = "全部: " + totalTasks;
    document.getElementById("toDoCount").textContent = "未完成: " + toDoCount;
    document.getElementById("inProgressCount").textContent =
        "执行中: " + inProgressCount;
    document.getElementById("doneCount").textContent = "已完成: " + doneCount;
}

/*=================模拟后端(mock.js)相关的函数===================*/
/**
 * 模拟后端, 提供接口 /api/updateList、/api/getLists和/api/deleteList
 * 对应函数: updateListToDB()、getAllDataFromDB()和deleteListFromDB()
 */
function configureMock() {
    Mock.mock("/api/updateList", "post", (options) => {
        const postData = JSON.parse(options.body);

        const response = {
            message: "update request received successfully",
            payload: postData, // 使用请求中的负载数据作为响应的一部分
        };

        return response;
    });

    Mock.mock("/api/getLists", "get", {
        "list|1-5": [
            {
                name: "@title(1,10)",
                "tasks|0-5": [
                    {
                        "status|1": ["todo", "done", "inProgress"],
                        content: "@ctitle(5, 20)",
                    },
                ],
            },
        ],
    });

    Mock.mock("/api/deleteList", "post", (options) => {
        const postData = JSON.parse(options.body);

        const response = {
            message: "delete request received successfully",
            payload: postData, // 使用请求中的负载数据作为响应的一部分
        };

        return response;
    });
}

/*=================前端请求(axios)相关的函数===================*/
/**
 * 新增/更新list数据(使用axios测试)
 * @param {object} database 数据库实例
 * @param {string} storeName 仓库名称
 * @param {dict} data list数据, 字典格式
 */
function updateListToDB(database, storeName, sendData) {
    return new Promise((resolve, reject) => {
        axios({
            method: "post",
            url: "/api/updateList",
            data: sendData,
        })
        .then((response) => {
            const responseData = response.data;
            console.log(responseData);
            resolve("Data written/updated successfully");
        })
        .catch((error) => {
            reject("Data write/update failed: " + error);
        });
    });
}

/**
 * 获取所有的列表及待办数据(使用axios测试)
 * @param {object} database 数据库实例
 * @param {string} storeName 仓库名称
 * @return {lists} 返回一个类似于lists的字典数组
 */
function getAllDataFromDB(database, storeName) {
    return new Promise((resolve, reject) => {
        axios.get("/api/getLists")
        .then((response) => {
            // resolve(Object.values(response.data));
            resolve(response.data.list);
        })
        .catch((error) => {
            reject("Transaction to get all data failed: " + error);
        });
    });
}

/**
 * 通过主键删除数据(使用axios测试)
 * @param {object} database 数据库实例
 * @param {string} storeName 仓库名称
 * @param {string} id 主键值, 即要删除的列表名
 */
function deleteListFromDB(database, storeName, id) {
    return new Promise((resolve, reject) => {
        axios({
            method: "post",
            url: "/api/deleteList",
            data: id,
        })
        .then((response) => {
            const responseData = response.data;
            console.log(responseData);
            resolve("Data deleted successfully");
        })
        .catch((error) => {
            reject("Data deleted failed: " + error);
        });
    });
}
