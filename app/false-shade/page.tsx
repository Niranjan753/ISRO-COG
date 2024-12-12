'use client';

import { useState } from 'react';
import styled from 'styled-components';
import Navbar from '../components/Navbar';

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #e8f0f2;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: #ffffff;
  padding: 20px;
  border-right: 2px solid #00796b;
  box-shadow: 4px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;

  h1 {
    color: #00796b;
    margin-bottom: 20px;
  }

  form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    width: 100%;
  }

  input[type="file"] {
    border: 2px solid #00796b;
    border-radius: 5px;
    padding: 10px;
    background-color: #e0f2f1;
    color: #00796b;
    width: 100%;
  }

  select, button {
    padding: 12px;
    border: 2px solid #00796b;
    border-radius: 5px;
    background-color: #ffffff;
    color: #00796b;
    font-size: 16px;
    cursor: pointer;
    width: 100%;
  }

  button {
    background-color: #00796b;
    color: white;
    font-weight: bold;
    border: none;
    transition: background-color 0.3s;

    &:hover {
      background-color: #004d40;
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #00796b;
  }
`;

const Content = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ImageContainer = styled.div`
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  img {
    width: 100%;
    height: auto;
    max-height: 80vh;
    border-radius: 8px;
  }
`;

const Message = styled.div`
  color: red;
  margin-top: 10px;
`;

const PlaceholderSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;

  img {
    max-width: 400px;
    margin-bottom: 1.5rem;
  }

  h2 {
    color: #00796b;
    margin-bottom: 1rem;
  }
`;

interface FormData {
  colormap: string;
}

export default function HillShade() {
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    colormap: 'gray',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.querySelector<HTMLInputElement>('#fileInput');
    
    if (!fileInput?.files?.[0]) {
      setMessage('Please select a file');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', fileInput.files[0]);
    formDataToSend.append('colormap', formData.colormap);

    try {
      const response = await fetch('/api/hill-shade', {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await response.json();

      if (data.image) {
        setProcessedImage(data.image);
        setMessage('');
      } else {
        setMessage(data.error || 'An error occurred');
      }
    } catch (error) {
      setMessage('Failed to process image');
    }
  };

  return (
    <>
    <Navbar />
    <Container className='mt-12'>
      <Sidebar>
        <h1>TIFF Visualization</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            id="fileInput"
            accept=".tiff, .tif"
            required
          />

          <label htmlFor="colormap">Select Colormap:</label>
          <select
            id="colormap"
            value={formData.colormap}
            onChange={(e) => setFormData({ ...formData, colormap: e.target.value })}
          >
            <option value="gray">Gray</option>
            <option value="viridis">Viridis</option>
            <option value="inferno">Inferno</option>
            <option value="plasma">Plasma</option>
            <option value="hsv">HSV</option>
            <option value="bathymetry">Bathymetry</option>
          </select>

          <button type="submit">Upload and Process</button>
        </form>
        {message && <Message>{message}</Message>}
      </Sidebar>

      <Content>
        {!processedImage ? (
          <PlaceholderSection>
            <img src="/isro-logo.png" alt="ISRO Logo" />
            <h2>Upload a TIFF file to visualize hillshade analysis</h2>
          </PlaceholderSection>
        ) : (
          <ImageContainer>
            <img src={`data:image/png;base64,${processedImage}`} alt="Processed TIFF" />
          </ImageContainer>
        )}
      </Content>
    </Container>
    </>
  );
}