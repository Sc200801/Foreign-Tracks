export class AboutScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AboutScene' });
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // 1. Sombra exterior y contenedor principal (Tarjeta Blanca)
        this.add.rectangle(cx + 4, cy + 4, 760, 520, 0x2b1d19, 0.5).setOrigin(0.5);
        const cardBg = this.add.rectangle(cx, cy, 760, 520, 0xffffff, 1).setOrigin(0.5);
        cardBg.setStrokeStyle(4, 0x2b1d19);

        // 2. Título principal estilo "HOW TO PLAY?"
        this.add.text(cx, cy - 215, '¿QUIÉNES SOMOS?', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: '#2b1d19'
        }).setOrigin(0.5);

        // 3. Caja interna para el texto
        const innerBox = this.add.rectangle(cx, cy - 20, 700, 330, 0xffffff, 1).setOrigin(0.5);
        innerBox.setStrokeStyle(2, 0x2b1d19);

        // 4. Texto descriptivo completo
        const textContent = 
`Somos un equipo apasionado por el desarrollo de software, el diseño interactivo y la creación de experiencias digitales innovadoras. Creemos firmemente que la mejor forma de aprender y adquirir nuevas habilidades es a través del juego, la curiosidad y el reto constante.

Foreign Tracks nace precisamente de esa idea: construir un espacio donde la cultura global, la estética visual en pixel art y el aprendizaje dinámico del idioma inglés se conecten en tiempo real. Cada escenario, mecánica de juego y línea de código han sido diseñados para que los jugadores exploren el mundo mientras fortalecen sus conocimientos lingüísticos y compiten de manera divertida con otros usuarios.

Nuestro objetivo principal es hacer del aprendizaje una aventura accesible, entretenida y visualmente atractiva. Agradecemos enormemente a cada persona que juega, comparte y forma parte de nuestra comunidad. ¡Gracias por acompañarnos en este viaje y ser parte de Foreign Tracks!`;

        this.add.text(cx, cy - 20, textContent, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#222222',
            align: 'center',
            wordWrap: { width: 660 }
        }).setOrigin(0.5);

        // 5. Botón inferior estilo retro ("VOLVER AL MENÚ")
        const btnMenuBg = this.add.rectangle(cx, cy + 200, 700, 45, 0xffecb3).setOrigin(0.5);
        btnMenuBg.setStrokeStyle(3, 0x2b1d19);
        btnMenuBg.setInteractive({ useHandCursor: true });

        this.add.text(cx, cy + 200, 'VOLVER AL MENÚ', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#2b1d19'
        }).setOrigin(0.5);

        // Eventos del botón
        btnMenuBg.on('pointerdown', () => {
            this.scene.start('Menu');
        });

        btnMenuBg.on('pointerover', () => btnMenuBg.setFillStyle(0xffd54f));
        btnMenuBg.on('pointerout', () => btnMenuBg.setFillStyle(0xffecb3));
    }
}