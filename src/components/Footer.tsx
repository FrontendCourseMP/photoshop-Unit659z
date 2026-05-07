import {
  Paper,
  Container,
  Typography,
  Box,
  Stack,
  Divider,
} from "@mui/material";

interface FooterProps {
  imgInfo: {
    width: number;
    height: number;
    depth: number;
    hasMask: boolean;
  };
  pickedColor: {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    lab: [number, number, number];
  } | null;
}

const Footer = ({ imgInfo, pickedColor }: FooterProps) => {
  return (
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
        zIndex: 1201,
      }}
    >
      <Container maxWidth="xl">
        <Stack
          direction="row"
          spacing={3}
          sx={{ alignItems: "center" }} 
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Typography variant="body2" color="text.secondary">
            Resolution: {imgInfo.width} × {imgInfo.height} px | Color Depth:{" "}
            {imgInfo.depth} bit {imgInfo.hasMask ? "+ 1 bit mask" : ""}
          </Typography>

          {pickedColor && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`,
                  border: "1px solid #ccc",
                }}
              />
              <Typography variant="body2" color="text.primary">
                Pos: ({pickedColor.x}, {pickedColor.y})
              </Typography>
              <Typography variant="body2" color="text.primary">
                RGB: ({pickedColor.r}, {pickedColor.g}, {pickedColor.b})
              </Typography>
              <Typography variant="body2" color="text.primary">
                Lab: ({pickedColor.lab[0]}, {pickedColor.lab[1]},{" "}
                {pickedColor.lab[2]})
              </Typography>
            </Stack>
          )}
        </Stack>
      </Container>
    </Paper>
  );
};

export default Footer;
