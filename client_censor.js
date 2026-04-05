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

const client = new triageProto.VitalsService('localhost:50051', grpc.credentials.createInsecure());

function monitoring() {
    const call = client.MonitorVitals();

    call.on('data', (alert) => {
        console.log(`\n🚨 [ALARM FROM SERVER] 🚨`);
        console.log(`Danger Level: ${alert.alert_level}`);
        console.log(`Instruction : ${alert.instruction}\n`);
    });

    call.on('error', (err) => {
        console.error("Stream connection cut off: ", err.message);
    });

    const patientId = "P-001"; 
    let bpm = 70;

    console.log(`Start transmitting censor for patient ${patientId}...`);

    // Simulation where the patient is worsening by the second
    const intervalId = setInterval(() => {
        bpm -= 5; 

        const vitalsData = {
            patient_id: patientId,
            bpm: bpm,
            blood_pressure_systolic: 120
        };

        console.log(`[TRANSMIT] Sending BPM: ${vitalsData.bpm}`);
        call.write(vitalsData);

        if (bpm <= 0) {
            clearInterval(intervalId);
            console.log("Transmission stopped.");
            call.end();
        }
    }, 1000); // Execution each minute
}

monitoring();