import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { Box, Drawer } from "@mui/material";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CanvasPreview from "./components/CanvasPreview";
import ChannelsPanel from "./components/ChannelsPanel";
import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { rgbToLab } from "./utils/colorConverter";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [channels, setChannels] = useState({ r: true, g: true, b: true, a: true });
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    lab: [number, number, number];
  } | null>(null);

  const [imgInfo, setImgInfo] = useState({
    width: 0,
    height: 0,
    depth: 0,
    hasMask: false,
  });

  // Re-render canvas when original data or channels change
  useEffect(() => {
    if (!originalImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, data } = originalImageData;
    const displayData = new ImageData(new Uint8ClampedArray(data), width, height);

    for (let i = 0; i < displayData.data.length; i += 4) {
      if (!channels.r) displayData.data[i] = 0;
      if (!channels.g) displayData.data[i + 1] = 0;
      if (!channels.b) displayData.data[i + 2] = 0;
      if (!channels.a) displayData.data[i + 3] = 255; // If alpha is "off", we show fully opaque? 
      // Actually, lab2 says: "If only the alpha channel is left, the user should see a transparency mask."
      // This usually means if R, G, B are off, we show Alpha as Grayscale.
    }

    // Special case: if only alpha is active, show it as grayscale
    if (!channels.r && !channels.g && !channels.b && channels.a) {
      for (let i = 0; i < displayData.data.length; i += 4) {
        const alpha = originalImageData.data[i + 3];
        displayData.data[i] = alpha;
        displayData.data[i + 1] = alpha;
        displayData.data[i + 2] = alpha;
        displayData.data[i + 3] = 255;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(displayData, 0, 0);
  }, [originalImageData, channels]);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    let imageData: ImageData | null = null;
    let depth = 0;
    let hasMask = false;

    if (file.name.toLowerCase().endsWith(".gb7")) {
      const buffer = await file.arrayBuffer();
      imageData = decodeGB7(buffer);
      if (imageData) {
        const view = new DataView(buffer);
        const flags = view.getUint8(5);
        hasMask = (flags & 0x01) !== 0;
        depth = 7;
      }
    } else {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = url;
      });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      }
      const isJpg = file.name.toLowerCase().match(/\.(jpg|jpeg)$/);
      depth = isJpg ? 24 : 32;
      URL.revokeObjectURL(url);
    }

    if (imageData) {
      setOriginalImageData(imageData);
      setImgInfo({
        width: imageData.width,
        height: imageData.height,
        depth: depth,
        hasMask: hasMask,
      });
      setChannels({ r: true, g: true, b: true, a: true });
      setPickedColor(null);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePNGClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    downloadFile(dataUrl, "image.png");
  };

  const handleSaveJPGClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg");
    downloadFile(dataUrl, "image.jpg");
  };

  const handleSaveGB7Click = () => {
    if (!originalImageData) return;
    const blob = encodeGB7(originalImageData);
    const url = URL.createObjectURL(blob);
    downloadFile(url, "image.gb7");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !originalImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors if CSS resized the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < originalImageData.width && y >= 0 && y < originalImageData.height) {
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const lab = rgbToLab(r, g, b);

      setPickedColor({ x, y, r, g, b, lab });
    }
  };

  const toggleChannel = (channel: "r" | "g" | "b" | "a") => {
    if (imgInfo.depth === 7 && (channel === "r" || channel === "g" || channel === "b")) {
      setChannels((prev) => {
        const newState = !prev.r;
        return { ...prev, r: newState, g: newState, b: newState };
      });
    } else {
      setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header
        fileInputRef={fileInputRef}
        isEyedropperActive={isEyedropperActive}
        onOpenClick={handleOpenClick}
        onFileChange={handleFileChange}
        onSavePNG={handleSavePNGClick}
        onSaveJPG={handleSaveJPGClick}
        onSaveGB7={handleSaveGB7Click}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
      />

      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <Box sx={{ flexGrow: 1, position: "relative" }}>
          <CanvasPreview
            ref={canvasRef}
            width={imgInfo.width}
            onCanvasClick={handleCanvasClick}
            isEyedropperActive={isEyedropperActive}
          />
        </Box>
        
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            width: 240,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box", position: "relative" },
          }}
        >
          <ChannelsPanel
            imageData={originalImageData}
            channels={channels}
            onToggleChannel={toggleChannel}
            imgInfo={imgInfo}
          />
        </Drawer>
      </Box>

      <Footer
        imgInfo={imgInfo}
        pickedColor={pickedColor}
      />
    </Box>
  );
}

export default App;
