const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/parkzen")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// ================= USER MODEL =================
const UserSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model("User", UserSchema);

let totalSlots = 50;
let vehicles = [];
let totalRevenue = 0;
let idCounter = 1;

// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
    let { username, password } = req.body;
    try {
        let existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ message: "User already exists" });
        }
        let newUser = new User({ username, password });
        await newUser.save();
        res.json({ message: "Signup successful" });
    } catch (err) {
        res.json({ message: "Error saving user" });
    }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    let { username, password } = req.body;
    try {
        let user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        res.json({ success: false });
    }
});

// ================= STATUS =================
app.get("/status", (req, res) => {
    let occupied = vehicles.filter(v => v.status === "Parked").length;
    let available = totalSlots - occupied;

    let bestSlot = available > 0 ? `Slot ${occupied + 1}` : "No Slot Available";

    let prediction = "";
    if (available > 40) prediction = "Low occupancy expected";
    else if (available > 20) prediction = "Moderate occupancy";
    else prediction = "High occupancy / Filling fast";

    let status = "";
    if (available === 0) status = "FULL";
    else if (available < 10) status = "ALMOST FULL";
    else status = "AVAILABLE";

    res.json({ totalSlots, occupied, available, vehicles, totalRevenue, bestSlot, prediction, status });
});

// ================= PARK =================
app.post("/park", (req, res) => {
    let { owner, number, vehicleName, type, payment, price } = req.body;

    let newVehicle = {
        id: idCounter++,
        owner, number, vehicleName, type, payment, price,
        entryTime: new Date().toISOString(),
        exitTime: null,
        status: "Parked"
    };

    vehicles.push(newVehicle);
    totalRevenue += Number(price);

    res.json({ message: "Parked", vehicle: newVehicle });
});

// ================= EXIT =================
app.post("/exit", (req, res) => {
    let { id } = req.body;
    let vehicle = vehicles.find(v => String(v.id) === String(id));
    if (!vehicle) return res.json({ message: "Not found" });

    vehicle.status = "Exited";
    vehicle.exitTime = new Date().toISOString();

    res.json({ message: "Exited" });
});

// ================= DELETE =================
app.post("/delete", (req, res) => {
    let { id } = req.body;
    if (id === undefined || id === null) {
        return res.json({ message: "Invalid ID" });
    }
    vehicles = vehicles.filter(v => String(v.id) !== String(id));
    res.json({ message: "Deleted successfully" });
});

// ================= RESET =================
app.post("/resetRevenue", (req, res) => {
    totalRevenue = 0;
    res.json({ message: "Revenue reset" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
