window.onload = function () {

const API = "http://localhost:5000";

// ================= STORE ALL DATA =================
let allVehicles = JSON.parse(localStorage.getItem("vehicles")) || [];

// ================= SAVE TO LOCAL =================
function saveToLocal() {
    localStorage.setItem("vehicles", JSON.stringify(allVehicles));
}

// ================= AUTO PRICE =================
const priceMap = {
    "Car": 50,
    "Bike": 20,
    "Scooty": 30
};

document.getElementById("vehicleType").addEventListener("change", function () {
    let type = this.value;
    document.getElementById("price").value = priceMap[type] || "";
});

// ================= SHOW QR =================
document.getElementById("payment").addEventListener("change", function () {
    let qrBox = document.getElementById("qrBox");
    let qrImage = document.getElementById("qrImage");

    if (this.value === "Online") {
        qrBox.style.display = "block";
        qrImage.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ParkzenPayment";
    } else {
        qrBox.style.display = "none";
    }
});

// ================= LOAD =================
function loadData() {
    let occupied = allVehicles.filter(v => v.status === "Parked").length;
    let available = 50 - occupied;
    let revenue = allVehicles.reduce((sum, v) => sum + Number(v.price || 0), 0);

    document.getElementById("occupied").innerText = occupied;
    document.getElementById("available").innerText = available;
    document.getElementById("revenue").innerText = revenue;

    document.getElementById("bestSlot").innerText = available > 0 ? `Slot ${occupied + 1}` : "-";

    document.getElementById("prediction").innerText =
        available > 40 ? "Low occupancy" :
        available > 20 ? "Moderate occupancy" :
        "High occupancy";

    document.getElementById("status").innerText =
        available === 0 ? "FULL" :
        available < 10 ? "ALMOST FULL" :
        "AVAILABLE";

    displayVehicles(allVehicles);
}

// ================= TIME =================
function formatTime(t) {
    if (!t) return "-";
    let d = new Date(t);
    return isNaN(d) ? "-" : d.toLocaleString();
}

// ================= DISPLAY =================
function displayVehicles(list) {
    let table = document.getElementById("vehicleTable");
    table.innerHTML = "";

    if (list.length === 0) {
        table.innerHTML = `<tr><td colspan="12" style="color:red; font-weight:bold;">No Record Found</td></tr>`;
        return;
    }

    list.forEach((v, i) => {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${v.owner}</td>
            <td>${v.number}</td>
            <td>${v.vehicleName || "-"}</td>
            <td>${v.type}</td>
            <td>${v.payment}</td>
            <td>${v.price}</td>
            <td>${formatTime(v.entryTime)}</td>
            <td>${formatTime(v.exitTime)}</td>
            <td>${v.status}</td>
            <td>
                ${v.status === "Parked"
                ? `<button onclick="exitVehicle(${v.id})">Exit</button>`
                : "Exited"}
            </td>
            <td>
                <button onclick="deleteVehicle(${v.id})">Delete</button>
            </td>
        `;
        table.appendChild(row);
    });
}

// ================= SEARCH =================
window.searchVehicle = function () {
    let input = document.getElementById("search").value.toLowerCase().trim();

    if (input === "") {
        displayVehicles(allVehicles);
        return;
    }

    let filtered = allVehicles.filter(v => {
        return (
            (v.owner && v.owner.toLowerCase().includes(input)) ||
            (v.number && v.number.toLowerCase().includes(input)) ||
            (v.vehicleName && v.vehicleName.toLowerCase().includes(input)) ||
            (v.type && v.type.toLowerCase().includes(input)) ||
            (v.payment && v.payment.toLowerCase().includes(input))
        );
    });

    if (filtered.length === 0) {
        document.getElementById("vehicleTable").innerHTML =
            `<tr><td colspan="12" style="color:red; font-weight:bold;">No Record Found</td></tr>`;
    } else {
        displayVehicles(filtered);
    }
};

// ================= FILTER =================
window.filterData = function (type) {
    let filtered = [];
    let today = new Date();
    let todayStr = today.toISOString().split("T")[0];
    let yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let yesterdayStr = yesterday.toISOString().split("T")[0];

    if (type === "today") {
        filtered = allVehicles.filter(v => v.entryTime && v.entryTime.startsWith(todayStr));
    } else if (type === "yesterday") {
        filtered = allVehicles.filter(v => v.entryTime && v.entryTime.startsWith(yesterdayStr));
    } else {
        filtered = allVehicles;
    }

    displayVehicles(filtered);
};

// ================= RESET =================
window.resetRevenue = function () {
    allVehicles = [];
    saveToLocal();
    document.getElementById("revenue").innerText = 0;
    document.getElementById("vehicleTable").innerHTML =
        `<tr><td colspan="12" style="color:red; font-weight:bold;">No Record Found</td></tr>`;
    alert("Revenue Reset Successfully");
};

// ================= LOGOUT =================
window.logout = function () {
    localStorage.removeItem("isLoggedIn");
    alert("Logged out successfully");
    window.location.href = "login.html";
};

// ================= PARK =================
window.parkCar = function () {
    let owner = document.getElementById("ownerName").value;
    let number = document.getElementById("carNumber").value;
    let vehicleName = document.getElementById("vehicleName").value;
    let type = document.getElementById("vehicleType").value;
    let payment = document.getElementById("payment").value;
    let price = document.getElementById("price").value;

    if (!owner || !number || !type || !payment) {
        alert("Fill all fields");
        return;
    }

    let newVehicle = {
        id: Date.now(),
        owner,
        number,
        vehicleName,
        type,
        payment,
        price,
        entryTime: new Date().toISOString(),
        exitTime: null,
        status: "Parked"
    };

    allVehicles.push(newVehicle);
    saveToLocal();

    document.querySelectorAll("input, select").forEach(el => el.value = "");
    document.getElementById("qrBox").style.display = "none";

    loadData();
};

// ================= EXIT (WITH EXTRA CHARGE) =================
window.exitVehicle = function (id) {
    let v = allVehicles.find(v => v.id == id);

    if (v && v.status === "Parked") {
        let entry = new Date(v.entryTime);
        let exit = new Date();
        let diffHours = (exit - entry) / (1000 * 60 * 60);
        let extraCharge = 0;

        if (diffHours > 3) {
            extraCharge = Math.ceil(diffHours - 3) * 20;
        }

        let finalPrice = Number(v.price) + extraCharge;

        v.status = "Exited";
        v.exitTime = exit.toISOString();
        v.price = finalPrice;

        saveToLocal();

        alert(`Vehicle Exited\nExtra Charge: ₹${extraCharge}\nTotal: ₹${finalPrice}`);

        loadData();
    }
};

// ================= DELETE =================
window.deleteVehicle = function (id) {
    let confirmDelete = confirm("Are you sure you want to delete?");
    if (!confirmDelete) return;

    allVehicles = allVehicles.filter(v => v.id != id);
    saveToLocal();
    loadData();
};

// ================= ENTER NAV =================
let inputs = document.querySelectorAll("input, select");
inputs.forEach((input, index) => {
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else {
                parkCar();
            }
        }
    });
});

// ================= INIT =================
loadData();

};
