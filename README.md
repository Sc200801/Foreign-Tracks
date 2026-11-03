# Foreign Tracks

- **Equipo responsable:** Equipo 2 (Proyecto *Foreign Tracks*)
- **Puerto de la interfaz web:** `8201`
- **Usuarios y contraseñas de prueba:** 
  - Al crearse la base de datos vacía, puedes registrarte directamente como alumno o profesor desde la interfaz de autenticación del juego.
  - Para crear una sala desde la ventana del docente la clave institucional es: "ADMIN123"
- **Descripción:** Videojuego web 2D interactivo desarrollado con Node.js, Express, Socket.io, Phaser y MariaDB, diseñado como una herramienta educativa para fomentar el aprendizaje del inglés mediante simulación y cooperación en tiempo real.

## Cómo ejecutar el proyecto con Docker

1. Asegúrate de tener Docker y Docker Compose instalados en tu computadora.
2. Abre una terminal en la carpeta raíz del proyecto.
3. Ejecuta el siguiente comando para construir y levantar los contenedores:
   ```bash
   docker compose up -d --build
