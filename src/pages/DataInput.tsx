import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';

interface BuildingForm {
  name: string;
  type: string;
  size: number;
  location: string;
}

const DataInput: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<BuildingForm>();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [floorPlanImage, setFloorPlanImage] = useState<File | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (data: BuildingForm) => {
    if (!csvFile) {
      alert('Please upload a CSV file with energy consumption data.');
      return;
    }

    const formData = new FormData();
    formData.append('buildingData', JSON.stringify(data));
    formData.append('csvFile', csvFile);
    if (floorPlanImage) {
      formData.append('floorPlanImage', floorPlanImage);
    }

    // In a real application, you would send this data to your backend
    console.log('Form data:', data);
    console.log('CSV file:', csvFile);
    console.log('Floor plan image:', floorPlanImage);

    // For now, we'll simulate sending the data and navigate to the analysis page
    localStorage.setItem('buildingData', JSON.stringify(data));
    localStorage.setItem('csvFileName', csvFile.name);

    // Read the CSV file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      localStorage.setItem('csvContent', csvContent);
      navigate('/analysis');
    };
    reader.readAsText(csvFile);
  };

  const onCsvDrop = (acceptedFiles: File[]) => {
    setCsvFile(acceptedFiles[0]);
  };

  const onImageDrop = (acceptedFiles: File[]) => {
    setFloorPlanImage(acceptedFiles[0]);
  };

  const { getRootProps: getCsvRootProps, getInputProps: getCsvInputProps } = useDropzone({
    onDrop: onCsvDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    onDrop: onImageDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const downloadCsvTemplate = () => {
    const csvContent = `Date,Electricity (kWh),Gas (therms),Water (gallons),HVAC (kWh),Lighting (kWh),Equipment (kWh)
2023-01-01,1000,50,5000,400,300,300
2023-01-02,950,48,4800,380,290,280
2023-01-03,1100,52,5200,420,330,350
2023-01-04,980,49,4900,390,295,295
2023-01-05,1050,51,5100,410,315,325
2023-01-06,900,47,4700,360,270,270
2023-01-07,850,45,4500,340,255,255`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'energy_consumption_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Input</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Building Name</label>
          <input
            type="text"
            id="name"
            {...register('name', { required: 'Building name is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">Building Type</label>
          <select
            id="type"
            {...register('type', { required: 'Building type is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select a type</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
          {errors.type && <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>}
        </div>

        <div>
          <label htmlFor="size" className="block text-sm font-medium text-gray-700">Building Size (sq ft)</label>
          <input
            type="number"
            id="size"
            {...register('size', { required: 'Building size is required', min: { value: 1, message: 'Size must be greater than 0' } })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.size && <p className="mt-2 text-sm text-red-600">{errors.size.message}</p>}
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            id="location"
            {...register('location', { required: 'Location is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.location && <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Energy Consumption Data (CSV)</label>
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download size={16} className="mr-2" />
              Download CSV Template
            </button>
          </div>
          <div {...getCsvRootProps()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Upload a file</span>
                  <input {...getCsvInputProps()} id="file-upload" name="file-upload" type="file" className="sr-only" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV up to 10MB</p>
            </div>
          </div>
          {csvFile && <p className="mt-2 text-sm text-gray-600">File selected: {csvFile.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Floor Plan Image (optional)</label>
          <div {...getImageRootProps()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Upload an image</span>
                  <input {...getImageInputProps()} id="image-upload" name="image-upload" type="file" className="sr-only" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          {floorPlanImage && <p className="mt-2 text-sm text-gray-600">Image selected: {floorPlanImage.name}</p>}
        </div>

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Data and Analyze
          </button>
        </div>
      </form>
    </div>
  );
};

export default DataInput;