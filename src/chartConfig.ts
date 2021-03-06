let lineChart: any = {
    type: 'line',
    data: {
        datasets: [{
            data: null,
            lineTension: 0
        }
        ],
        labels: []
    },
    options: {
        legend: {
            display: false
        },
        title: {
            display: true,
            text: null
        }
    }
}

let barChart: any = {
    type: 'bar',
    data: {
        datasets: [{
            data: null,
            lineTension: 0
        }
        ],
        labels: []
    },
    options: {
        legend: {
            display: false
        },
        title: {
            display: true,
            text: null
        }
    }
}

export { lineChart, barChart };