/**
 * Listas padrão de mídia da página /galeria. Compartilhadas entre a
 * página pública (fallback quando o config está vazio) e o admin
 * (pré-popular config + listar URLs externas na biblioteca).
 */
import type { GalleryVideo } from "./gallery.functions";

export const DEFAULT_HERO_SLIDES: string[] = [
  "/wh/9brow167BD7vSTImdvlzbGTTd0.webp",
  "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp",
  "/wh/Bi6OG3sJ6VVrkGbNCU7xvvqaq38.webp",
  "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
];

export const DEFAULT_PHOTOS: string[] = [
  "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp",
  "/wh/Oq73XE0jISa881AUlgxkrUQFf0.webp",
  "/wh/PqfEESKEI4KyPEbWp9VFYKCHHhs.webp",
  "/wh/QYh5P2x7MjxPcRw8gciuiMZaE.webp",
  "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp",
  "/wh/RDQXRypylJzj50EZG0zadUgIPT4.webp",
  "/wh/RuTtpWzHKZwo5zG1IMVX5pmrphg.webp",
  "/wh/TE9jubHofUXX4lw0f6yyJbvuf8I.webp",
  "/wh/VFMDgkjwXx73ARG7ylBNumYfQiU.webp",
  "/wh/VcwdGXlLLAL1TZBt5cmh0uR0sIw.webp",
  "/wh/WWP2BNk54ilZcgtS3ZQUz2Uk.webp",
  "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp",
  "/wh/aru9eTRt206G3gmo9ggFw3VlmRM.webp",
  "/wh/dJCbNYIoiVhtPc4d0dnE68PmKNk.webp",
  "/wh/lhAqI3SkQvc8rU1J20IT1rFoEo.webp",
  "/wh/r7lucTL7MdleypaKg0jfQFChPAo.webp",
  "/wh/sX6ZmDQIJN5kQdtdQ2MqRgmfaR8.webp",
];

export const DEFAULT_VIDEOS: GalleryVideo[] = [
  { id: "v1", poster: "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp", title: "Welcome Way Home" },
  { id: "v2", poster: "/wh/Oq73XE0jISa881AUlgxkrUQFf0.webp", title: "Pool & sunset" },
  { id: "v3", poster: "/wh/PqfEESKEI4KyPEbWp9VFYKCHHhs.webp", title: "After party" },
  { id: "v4", poster: "/wh/RDQXRypylJzj50EZG0zadUgIPT4.webp", title: "Suítes premium" },
  { id: "v5", poster: "/wh/lhAqI3SkQvc8rU1J20IT1rFoEo.webp", title: "Comunidade" },
  { id: "v6", poster: "/wh/dJCbNYIoiVhtPc4d0dnE68PmKNk.webp", title: "Café da manhã" },
];