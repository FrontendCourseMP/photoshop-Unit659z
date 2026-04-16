import { useState, useRef, type ChangeEvent } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Paper,
  Stack,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";

const decodeGB7 = (buffer: ArrayBuffer): ImageData | null => {
  const view = new DataView(buffer);

  // сигнатуры
  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x42 ||
    view.getUint8(2) !== 0x37 ||
    view.getUint8(3) !== 0x1d
  ) {
    alert("Invalid GB7 signature");
    return null;
  }

  // версия
  const version = view.getUint8(4);
  if (version !== 1) {
    alert("Unsupported GB7 version");
    return null;
  }

  // флаги и размеры
  const flags = view.getUint8(5);
  const hasMask = (flags & 0x01) !== 0; // 0й бит

  // 16 битные числа Big-Endian сетевой порядок
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);

  //  данные пикселей начинаются с 12 байта
  const pixelData = new Uint8Array(buffer, 12, width * height);

  // объект для canvas RGBA, 4 байт на пиксель
  const imageData = new ImageData(width, height);

  for (let i = 0; i < pixelData.length; i++) {
    const byte = pixelData[i];

    // младшие 7 бит  это оттенок серого от 0 до 127
    const gray7 = byte & 0x7f;

    // 7-битное значение 0-127 в 8 битное 0-255 для canvas
    const gray8 = Math.round((gray7 * 255) / 127);

    // 7 бит если есть маска
    let alpha = 255;
    if (hasMask) {
      const isMasked = (byte & 0x80) === 0; // 0 прозрачный
      if (isMasked) alpha = 0;
    }

    // пиксель в формат RGBA
    const idx = i * 4;
    imageData.data[idx] = gray8; // R
    imageData.data[idx + 1] = gray8; // G
    imageData.data[idx + 2] = gray8; // B
    imageData.data[idx + 3] = alpha; // A
  }

  return imageData;
};

const encodeGB7 = (imageData: ImageData): Blob => {
  const { width, height, data } = imageData;

  // 12 байт заголовок + по 1 байту на каждый пиксель
  const buffer = new ArrayBuffer(12 + width * height);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // сигнатура GB7
  view.setUint8(0, 0x47);
  view.setUint8(1, 0x42);
  view.setUint8(2, 0x37);
  view.setUint8(3, 0x1d);

  // версия
  view.setUint8(4, 0x01);

  // флаги 0x01, всегда будет бит маски от альфа-канала
  view.setUint8(5, 0x01);

  // ширина и высота Big-Endian
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);

  // зарезервированные байты
  view.setUint16(10, 0x0000, false);

  // запись пикселей
  let offset = 12;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // перевод в градации серого (стандартная формула светимости)
    const gray8 = 0.299 * r + 0.587 * g + 0.114 * b;

    //  8бит 0-255 в 7бит 0-127
    const gray7 = Math.round((gray8 * 127) / 255) & 0x7f;

    // бит маски 1 если пиксель непрозрачный альфа > 127, 0 если прозрачный
    const maskBit = a > 127 ? 1 : 0;

    // сборка старший бит маска, остальные 7 цвет
    const byte = (maskBit << 7) | gray7;
    uint8View[offset++] = byte;
  }

  return new Blob([buffer], { type: "application/octet-stream" });
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgInfo, setImgInfo] = useState({
    width: 0,
    height: 0,
    depth: 0,
  });

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // очистка для возможности повторной загрузки
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (file.name.toLowerCase().endsWith(".gb7")) {
      // логика для кастомного формата
      const buffer = await file.arrayBuffer();
      const imageData = decodeGB7(buffer);

      if (imageData) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);

        setImgInfo({
          width: imageData.width,
          height: imageData.height,
          depth: 7, // родная глубина цвета формата
        });
      }
    } else {
      // логика для png/jpg
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        setImgInfo({
          width: img.width,
          height: img.height,
          depth: 32,
        });

        URL.revokeObjectURL(url);
      };
      img.src = url;
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

  const handleSaveGB7Click = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const blob = encodeGB7(imageData);
    const url = URL.createObjectURL(blob);

    downloadFile(url, "image.gb7");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GrayBit Editor
          </Typography>
          <Stack direction="row" spacing={2}>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.gb7"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              color="inherit"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenClick}
            >
              Open
            </Button>
            <Button
              color="inherit"
              startIcon={<DownloadIcon />}
              onClick={handleSavePNGClick}
            >
              Save PNG
            </Button>
            <Button
              color="inherit"
              startIcon={<DownloadIcon />}
              onClick={handleSaveGB7Click}
            >
              Save GB7
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        sx={{
          mt: 4,
          mb: 10,
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 1,
            bgcolor: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 300,
            minHeight: 200,
            overflow: "auto",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
          />
        </Paper>
      </Container>

      <Paper
        component="footer"
        square
        variant="outlined"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary">
            Resolution: {imgInfo.width} × {imgInfo.height} px | Color Depth:{" "}
            {imgInfo.depth} bit
          </Typography>
        </Container>
      </Paper>
    </Box>
  );
}

export default App;
