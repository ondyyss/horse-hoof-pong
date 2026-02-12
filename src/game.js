// Refactored Game Code

let cups = [
    { x: 100, y: 100, width: 30, height: 30 }, // Smaller cup
    { x: 250, y: 100, width: 30, height: 30 },
    { x: 400, y: 100, width: 30, height: 30 }
];

let ball = { x: 0, y: 0, speedX: 5, speedY: 5 };

function updateGame() {
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Check for cup collisions (adjust logic as necessary)
    for (let cup of cups) {
        if (isBallInCup(ball, cup)) {
            // Handle cup collision (e.g., scoring)
        }
    }

    // Allow the ball to pass through screen edges
    if (ball.x < 0) {
        ball.x = canvas.width;
    } else if (ball.x > canvas.width) {
        ball.x = 0;
    }

    if (ball.y < 0) {
        ball.y = canvas.height;
    } else if (ball.y > canvas.height) {
        ball.y = 0;
    }
}

function isBallInCup(ball, cup) {
    return (ball.x >= cup.x && ball.x <= cup.x + cup.width && ball.y >= cup.y && ball.y <= cup.y + cup.height);
}

// Invoke the updateGame function regularly
setInterval(updateGame, 1000 / 60);  // 60 FPS