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

const client = new triageProto.AdmissionService('localhost:50051', grpc.credentials.createInsecure());

function registerNewPatient() {
    const dataPatient = {
        name: "Budi Santoso",
        age: 65,
        complaint: "Nyeri Dada Hebat"
    };

    console.log("Registering Patient to ER Server...");
    
    client.RegisterPatient(dataPatient, (err, response) => {
        if (err) {
            console.error("Failed registration: ", err.details);
            return;
        }
        console.log(`Registration Succeeded. Patient ID: ${response.patient_id} | Initial Status: ${response.status}`);
    });
}

registerNewPatient();