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

const client = new triageProto.DashboardService('localhost:50051', grpc.credentials.createInsecure());

function openDashboard() {
    // Empty request to open stream from server
    const call = client.SubscribeDashboard({});

    call.on('data', (queueUpdate) => {
        // Membersihkan terminal setiap kali ada update agar terlihat seperti UI dinamis
        console.clear();
        console.log("==============================================");
        console.log("       DASHBOARD TRIAGE ER (REAL-TIME)        ");
        console.log(`       Update: ${new Date().toLocaleTimeString()} WIB`);
        console.log("==============================================\n");

        const patients = queueUpdate.active_patients || [];

        if (patients.length === 0) {
            console.log("No patient yet in the ER.");
            return;
        }

        patients.forEach((patient, index) => {
            const isCritical = patient.status === 'CRITICAL';
            const icon = isCritical ? '🔴' : '🟢';
            const statusLabel = isCritical ? '!!! CRITICAL !!!' : 'STABLE';
            
            console.log(`${index + 1}. ${icon} [${patient.patient_id}] ${patient.name} (${patient.age}th)`);
            console.log(`      Complaint: ${patient.complaint}`);
            console.log(`      Status   : ${statusLabel}\n`);
        });
    });

    call.on('error', (err) => {
        console.error("\n[SYSTEM] Dashboard Connection cut off.");
    });
}

openDashboard();