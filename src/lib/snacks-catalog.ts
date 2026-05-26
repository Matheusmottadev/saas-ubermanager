export type SnackProduct = {
  id: string;
  name: string;
  category: "Doces" | "Salgados" | "Bebidas";
  price: number;
  image: string;
};

export const snacksCatalog: SnackProduct[] = [
  {
    id: "agua-cristal-510",
    name: "Agua Cristal s/g 510ml",
    category: "Bebidas",
    price: 2.5,
    image: "/snacks-products/agua-cristal-510.jpg",
  },
  {
    id: "coca-200",
    name: "Coca-Cola 200ml",
    category: "Bebidas",
    price: 4,
    image: "/snacks-products/coca-200.jpg",
  },
  {
    id: "sprite-200",
    name: "Sprite 200ml",
    category: "Bebidas",
    price: 3,
    image: "/snacks-products/sprite-200.jpg",
  },
  {
    id: "coca-zero-200",
    name: "Coca-Cola Zero 200ml",
    category: "Bebidas",
    price: 4,
    image: "/snacks-products/coca-zero-200.jpg",
  },
  {
    id: "pepsi-200",
    name: "Pepsi Cola 200ml",
    category: "Bebidas",
    price: 3,
    image: "/snacks-products/pepsi-200.jpg",
  },
  {
    id: "halls-cereja",
    name: "Halls Cereja",
    category: "Doces",
    price: 3,
    image: "/snacks-products/halls-cereja.jpg",
  },
  {
    id: "halls-menta",
    name: "Halls Menta",
    category: "Doces",
    price: 3,
    image: "/snacks-products/halls-menta.jpg",
  },
  {
    id: "trident-menta",
    name: "Trident Menta",
    category: "Doces",
    price: 3,
    image: "/snacks-products/trident-menta.jpg",
  },
];

export const snacksCatalogMap = new Map(
  snacksCatalog.map((product) => [product.id, product]),
);
