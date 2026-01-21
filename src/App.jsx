import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Gallery from './components/Gallery';
import Upload from './components/Upload';

function App() {
  return (
    <BrowserRouter basename="/happy_archive/">
      <Layout>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
