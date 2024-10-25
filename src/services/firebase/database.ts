import { 
  doc, 
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { BuildingSystems, Report, VerificationInfo } from '../../types';

// Building Data - Store under user's collection
export const saveBuildingData = async (userId: string, data: any) => {
  // Create a reference to the user's buildings collection
  const userBuildingsRef = collection(db, `users/${userId}/buildings`);
  const buildingDoc = doc(userBuildingsRef);
  const buildingId = buildingDoc.id;

  // Save main building data
  await setDoc(buildingDoc, {
    ...data,
    id: buildingId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return buildingId;
};

// Building Systems - Store under building's collection
export const saveBuildingSystems = async (
  userId: string, 
  buildingId: string, 
  systems: BuildingSystems
) => {
  // Save building systems as a document in the building's subcollection
  const systemsRef = doc(db, `users/${userId}/buildings/${buildingId}/systems/current`);
  await setDoc(systemsRef, {
    ...systems,
    updatedAt: new Date().toISOString()
  });

  return systemsRef.id;
};

// Reports - Store under user's collection
export const saveReport = async (userId: string, report: Report) => {
  const userReportsRef = collection(db, `users/${userId}/reports`);
  const reportDoc = doc(userReportsRef);
  await setDoc(reportDoc, {
    ...report,
    id: reportDoc.id,
    createdAt: new Date().toISOString()
  });
  return reportDoc.id;
};

// Get Reports for User
export const getReports = async (userId: string): Promise<Report[]> => {
  const reportsRef = collection(db, `users/${userId}/reports`);
  const querySnapshot = await getDocs(reportsRef);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Report));
};

// Delete Report
export const deleteReportFromFirebase = async (userId: string, reportId: string): Promise<void> => {
  await deleteDoc(doc(db, `users/${userId}/reports/${reportId}`));
};

// File Upload - Organize by user and building
export const uploadFile = async (
  userId: string,
  path: string,
  file: File
): Promise<string> => {
  const timestamp = new Date().getTime();
  const storageRef = ref(storage, `users/${userId}/${path}/${timestamp}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Verification Info - Store under building's collection
export const saveVerificationInfo = async (
  userId: string,
  buildingId: string,
  verificationInfo: {
    verifierName: string;
    verifierCredentials: string;
    verifierLicenseNumber: string;
    verificationDate: string;
    signatureUrl?: string;
  }
) => {
  const verificationRef = doc(db, `users/${userId}/buildings/${buildingId}/verification/current`);
  await setDoc(verificationRef, {
    ...verificationInfo,
    updatedAt: new Date().toISOString()
  });
};

// Update Building Data
export const updateBuildingData = async (userId: string, buildingId: string, updates: any) => {
  const buildingRef = doc(db, `users/${userId}/buildings/${buildingId}`);
  await updateDoc(buildingRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};
