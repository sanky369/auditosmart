import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from '../auditosmart-firebase-adminsdk-kmi1w-ebeb90421e.json';  // Update this path to match your service account file name

// Initialize admin SDK with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

// Create collections with example documents
async function initializeFirestore() {
  try {
    // Create collections array
    const collections = [
      {
        name: 'users',
        docs: [{
          id: 'example-user',
          data: {
            email: 'example@test.com',
            displayName: 'Example User',
            organization: 'Test Org',
            role: 'user',
            createdAt: new Date().toISOString()
          }
        }]
      },
      {
        name: 'buildings',
        docs: [{
          id: 'example-building',
          data: {
            userId: 'example-user',
            name: 'Example Building',
            type: 'commercial',
            size: 50000,
            location: '123 Main St',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }]
      },
      {
        name: 'buildingSystems',
        docs: [{
          id: 'example-system',
          data: {
            userId: 'example-user',
            buildingId: 'example-building',
            hvacSystem: {
              type: 'Split System',
              age: 5,
              efficiency: 0.95,
              refrigerantType: 'R-410A',
              maintenanceSchedule: 'Monthly'
            },
            lightingSystem: {
              types: ['LED', 'Fluorescent'],
              controlSystems: ['Motion Sensors'],
              operatingSchedule: '8AM-6PM'
            },
            buildingEnvelope: {
              wallConstruction: 'Brick Veneer',
              roofType: 'Metal Roof',
              windowTypes: ['Double-pane'],
              insulationRValues: {
                walls: 13,
                roof: 30,
                foundation: 10
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }]
      }
    ];

    // Create all collections and documents
    for (const collection of collections) {
      console.log(`Creating collection: ${collection.name}`);
      for (const doc of collection.docs) {
        await db.collection(collection.name).doc(doc.id).set(doc.data);
        console.log(`Created document ${doc.id} in ${collection.name}`);
      }
    }

    console.log('Database structure initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
