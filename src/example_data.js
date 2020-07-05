export const example_data = JSON.stringify( {
  begin_at: '2020-07-04',
  finish_at: '2020-07-05',
  spots: [
    {
      geopos: [138.6728926, 35.1637692],
      name: '富士市瓜島町',
      data: [
        {
          date: '2020-07-04',
          infectors: 100
        },
        {
          date: '2020-07-05',
          infectors: 10
        }
      ]
    },
    {
      geopos: [138.621662, 35.222224],
      name: '富士宮市役所',
      data: [
        {
          date: '2020-07-04',
          infectors: 10
        },
        {
          date: '2020-07-05',
          infectors: 60
        }
      ]
    }
  ]
} );
