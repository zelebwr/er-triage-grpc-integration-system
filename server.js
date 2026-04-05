const grpc = require('@grpc/grpc-js'); 
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'triage.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
})
const triageProto = grpc.loadPackageDefinition(packageDefinition).triage;

/**
 * State Management Memory
 * * Uses Map instead of an Array
 */
const patientsState = new Map();
let patientCounter = 1;

// To save every active connection from Docter's Client (Dashboard)
const dashboardClients = new Set();

/**
 * Update Dashboard by broadcasting it
 * * Every time there is a patient status change, this function will push the newest data into every doctor's screen
 */
function broadcastDashboardUpdate() {
    const patientsArray = Array.from(patientsState.values());

    patientsArray.sort((a, b) => {
        if (a.status === 'CRITICAL' && b.status !== 'CRITICAL') return -1;
        if (a.status !== 'CRITICAL' && b.status === 'CRITICAL') return 1;
        return 0;
    })

    const updatePayload = { active_patients: patientsArray };

    for (const clientStream of dashboardClients) {
        clientStream.write(updatePayload);
    }
}

/**
 * Register Patient
 * @param call The request from client (supposedly nurse)
 * @param callback The response to client (supposedly nurse)
 * * At every end it will sync the dashboard before giving the response
 */
function RegisterPatient(call, callback) {
    const data = call.request;
    if (!data.name || !data.age || !data.complaint) {
        returncallback({
            code: grpc.status.INVALID_ARGUMENT,
            details: "There's an empty parameter. Name, age, and complaint must be filled and cannot be left empty."
        })
    }

    const newPatientId = `P-${patientCounter.toString().padStart(3,'0')}`;
    patientCounter++;

    const newRecord = {
        patient_id: newPatientId,
        status: "STABLE",
        name: data.name,
        age: data.age,
        complaint: data.complaint
    };
    patientsState.set(newPatientId, newRecord);
    console.log(`[SERVER] New Patient Registered: ${newPatientId} - ${data.name}`);

    broadcastDashboardUpdate();
    callback(null, {
        patient_id: newPatientId,
        status: newRecord.status
    });
}

/**
 * Monitor the Vitals of a patient
 * @param call Bi-directional Streaming data stream from the censor
 */
function MonitorVitals(call) {
    call.on('data', (vitals) => {
        const patient = patientsState.get(vitals.patient_id);
        if (!patient) {
            console.log(`[SERVER] Warning: Censor giving data for unknown ID (${vitals.patient_id})`);
            return;
        }
        console.log(`[CENOSR] ID: ${vitals.patient_id} | BPM: ${vitals.bpm} | SYS: ${vitals.blood_pressure_systolic}`);

        let isCritical = false;
        if (vitals.bpm < 50 || vitals.bpm || vitals.blood_pressure_systolic < 90) {
            isCritical = true;
        }

        if (isCritical && patient.status !== "CRITICAL") {
            patient.status = "CRITICAL";
            console.log(`[ALARM] Patient ${vitals.patient_id} is CRITICAL!`)

            call.write({
                alert_level: "DANGER",
                instruction: "CODE: RED. NEEDS MEDICAL ATTENTION RIGHT AWAY!"
            })

            broadcastDashboardUpdate();
        }
        else if (!isCritical && patient.status === "CRITICAL") {
            patient.status = "STABLE";
            console.log(`[INFO] Patient ${vitals.patient_id} is going STABLE.`);
            broadcastDashboardUpdate();
        }
    });

    call.on('end', () => {
        console.log("[SERVER] Censor connection cut off.");
        call.end();
    });
}

/**
 * Doctor's dashboard
 * @param call Server-side Streaming
 */
function SubscribeDashboard(call) {
    console.log("[SERVER] Doctor's Dashboard connected.");

    dashboardClients.add(call);

    const initialPatients = Array.from(patientsState.values());
    call.write({ active_patients: initialPatients });

    call.on('cancelled', () => {
        console.log("[SERVER] Doctor's Dashboard cut off.");
        dashboardClients.delete(call);
    });
}

function main() {
    const server = new grpc.Server();

    server.addService(triageProto.AdmissionService.service, { RegisterPatient: RegisterPatient });
    server.addService(triageProto.VitalsService.service, { MonitorVitals: MonitorVitals });
    server.addService(triageProto.DashboardService.service, { SubscribeDashboard: SubscribeDashboard });

    const bindAddress = "0.0.0.0:50051";
    server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error("Failed to run server: ", err);
            return;
        }
        console.log(`[SYSTEM] Server gRPC ER running on ${bindAddress}`);
        console.log("[SYSTEM] Waiting connection from client...")
    });
}

main();