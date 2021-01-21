import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import encoding from 'encoding-japanese';
const config = global.covid19map.config;
import { promises as fs } from "fs";
import fsx from "fs"
import path from "path";
import {axios_instance} from "./util.mjs";

// 前年以前のデータがあれば、読み込んでおく
export async function processPastYearData( pref_name ){

  // json/past/kkkk県フォルダを作る
  const pastCsvDir = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}`);

  if( fsx.existsSync( pastCsvDir )){
    // Log.info( "file exist");
  }else{
    await fs.mkdir(pastCsvDir);
    //fsx.mkdirSync(pastCsvDir);
  }

  // 前年と前年以前のCSV ファイル名を予め読み込む 
  const pastCsv = [];
  let lastYear=0;

  //for( const file of await fs.readdir(pastCsvDir).catch(()=>{ LOG.debug('*** no past files')})){ 
  for( const file of await fs.readdir(pastCsvDir).catch(()=>{ LOG.debug('*** no past files')})){ 
    const yyyy = file.match(/\d{4}/)[0];  // 年度
    lastYear = yyyy > lastYear ? yyyy : lastYear;
    const local_uri = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}`, file);
    //let pastData = await fs.readFile( local_uri);
    let pastData = await fs.readFile( local_uri);
    pastData = iconv.decode(pastData, 'utf8');
    const list = pastData.split(/\r\n|\r|\n/); 
    for ( const item of list){
      const m = item.match(/(\d+?)\/(\d+?),(.+?)$/);       // csv のテキスト形式
      if( m == null){
        break;
      }
      pastCsv.push( [ new Date(yyyy, m[1]-1, m[2]), m[3] ] );
    }
  }
  return { 
      pastCsv: pastCsv,
      lastYear: lastYear,
  };
}

// パースした csv に前年以前のデータがあれば、ファイルにセーブする
export async function savePastYearData( csv, pref_name ){

    function array2Csv( array ){
        let csvFormat='';
        for( const item of array){
          const mon = item[0].getMonth() + 1;
          const day = item[0].getDate();
          const city = item[1];
          csvFormat += mon + "/" + day + "," + city + "\n";
        }
        return csvFormat;
      }

  // 前年のデータをセーブ
  // 前年のデータが無い時もうまくいく。
  const today = new Date();
  let cYear = today.getFullYear();
  let oneYearCsv = [];
  let yearCount = 0;          // 読み込んだ csv に何年分の以前の年のデータあるか調べる
  for (const data of csv ){
    const _year = data[0].getFullYear();      // csv配列の日付の年
    if( _year == cYear ){
      oneYearCsv.push( data );
      continue;
    }

    // 今日の日付が　1月10日以前なら、前の年のデータをセーブしない。
    // 1月1日に、前年の12月終わりごろの日のデータが確定していない時を避けるため。
    if( cYear == today.getFullYear() && (today.getMonth() + 1) == 1 && (today.getDate() < 10) ){
      cYear --;
      oneYearCsv.push(data);  // 不要と思うが、デバッグを容易にするために置いておく。
      continue;
    }

    if( yearCount == 0){
      yearCount ++;       // save するデータが無い。
    }else{
      // cYear の data を save
      const pastCsvFile = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}/${cYear}.csv`);
      const csvFormat= array2Csv(oneYearCsv);
      await fs.writeFile(pastCsvFile,  csvFormat, 'utf8', (err) => Log.error(err) );
    }
    oneYearCsv.splice(0);       // 前年になったので、データを消す。
    oneYearCsv.push(data);
    cYear --;
  }

  // 最後 の cYear の data を save
  if( yearCount != 0){
    const pastCsvFile = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}/${cYear}.csv`);
    const csvFormat= array2Csv(oneYearCsv);
    await fs.writeFile(pastCsvFile,  csvFormat);
  }
  return;
}