// Utilidad simple para ID único
const generateUUID = () => Math.random().toString(36).substr(2, 9);

export class Elemento {
    constructor(x, y) {
        this.uuid = generateUUID();
        this.x = x;
        this.y = y;
    }
}

export class Piedra extends Elemento {
    constructor(x, y) {
        super(x, y);
        this.color = '#808080';
    }
}

export class Personaje extends Elemento {
    constructor(x, y) {
        super(x, y);
        this.vida = 50;
    }

    estaVivo() {
        return this.vida > 0;
    }
}

export class Malo extends Personaje {
    constructor(x, y) {
        super(x, y);
        this.color = '#FF0000';
    }

    atacar(objetivo) {
        const rand = Math.random();
        if (rand < 0.90) {
            // 90% Éxito
            objetivo.vida -= 3;
        } else {
            // 10% Fallo crítico
            this.vida -= 5;
        }
    }
}

export class Bueno extends Personaje {
    constructor(x, y) {
        super(x, y);
        this.color = '#00FF00';
    }
}