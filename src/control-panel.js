import * as React from 'react';
import {PureComponent} from 'react';
import { datetostring } from "./server/util.mjs";

export default class ControlPanel extends PureComponent
{
  state = {
    license_view: 0,
    description_view: 0
  };
  SHOW_HIDE_STYLES = [ "hidden", "show" ];
  _onClickShowDescription = () => this.setState( { description_view: this.state.description_view ^ 1 } );
  _onClickShowLicense = () => this.setState( { license_view: this.state.license_view ^ 1 } );

  render() {
    return (
      <div className="control-panel">
        <div className="right"><h3>{this.props.apimsg}</h3></div>
        <div className="right"><div className="blue"><button className="btn-square-small" onClick={this._onClickShowDescription}>ABOUT DATA...</button></div></div>
        <div className={ this.SHOW_HIDE_STYLES[ this.state.description_view ] }>
          <div className="scrollabletextbox">
            <table>
              <thead>
                <tr><th>prefecture</th><th>first</th><th>last</th></tr>
              </thead>
              <tbody>
              {
                this.props.srcdata && this.props.srcdata.summary.concat( Array.from( this.props.srcdata.places.values() ).sort( (a, b) => a.city_code - b.city_code ) )
                  .map( (v, i) => {
                    return <tr key={i}><td>{v.name}</td><td>{datetostring(v.begin_at)}</td><td>{datetostring(v.finish_at)}</td></tr>
                  } )
              }
              </tbody>
            </table>
          </div>
        </div>

        <div className="right"><button className="btn-square-small" onClick={this._onClickShowLicense}>LICENSE...</button></div>
        <div className={ this.SHOW_HIDE_STYLES[ this.state.license_view ] }>
          <div className="scrollabletextbox">
            <div className="pre">
              MIT License<br/>
                <br/>
              Copyright (c) 2020 Shizentai Factory Co., Takeshi Aida, Yoshiyuki Majima, KMiura.io, Osaka Prefectural Government, Gunma Prefectural Government, Shinji Matsumoto<br/>
                <br/>
              Permission is hereby granted, free of charge, to any person obtaining a copy
              of this software and associated documentation files (the "Software"), to deal
              in the Software without restriction, including without limitation the rights
              to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
              copies of the Software, and to permit persons to whom the Software is
              furnished to do so, subject to the following conditions:<br/>
                <br/>
              The above copyright notice and this permission notice shall be included in all
              copies or substantial portions of the Software.<br/>
                <br/>
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
              AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
              LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
              OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
              SOFTWARE.
            </div>

            <p><a href="https://creativecommons.org/licenses/by/2.1/jp/">岐阜県のデータセットはCC BY 2.1 JPで提供されています。©岐阜県健康福祉部</a></p>
            <p><a href="https://creativecommons.org/licenses/by/2.1/jp/">三重県のデータセットはCC BY 2.1 JPで提供されています。©三重県医療保健部</a></p>
            <p><a href="https://creativecommons.org/licenses/by/2.1/jp/">千葉市のデータセットはCC BY 2.1 JPで提供されています。©千葉市保健福祉局</a></p>
            <p><a href="https://creativecommons.org/licenses/by/2.1/jp/">愛媛県のデータセットはCC BY 2.1 JPで提供されています。©愛媛県保健福祉部健康増進課</a></p> {/* CCボタンのリンク無 とりあえず上記に合わせる */}
            <p><a href="https://creativecommons.org/licenses/by/4.0/">福岡県のデータセットはCC BY 4.0 JPで提供されています。©福岡県</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">長崎県のデータセットはCC BY 4.0 で提供されています。©長崎県</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">大分県のデータセットはCC BY 4.0 で提供されています。©大分県福祉保健部健康づくり支援課</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">沖縄県のデータセットはCC BY 4.0 で提供されています。©CODE for OKINAWA</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">山口県のデータセットはCC BY 4.0 で提供されています。©山口県</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">福井県のデータセットはCC BY 4.0 で提供されています。©福井県統計情報課</a></p>
            <p><a href="https://creativecommons.org/licenses/by/4.0/deed.ja">北海道のデータセットはCC BY 4.0 で提供されています。©北海道</a></p>
            <p>岡山県のデータセットはクリエイティブ・コモンズで提供されています。©岡山県</p>
            <p>長野県のデータセットは、以下の著作物を改変して利用しています。新型コロナウイルス感染症発生状況、長野県、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>奈良県のデータセットは、以下の著作物を改変して利用しています。奈良県_01新型コロナウイルス陽性感染者_患者リスト、奈良県、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>埼玉県のデータセットは、<a href="https://opendata.pref.saitama.lg.jp/data/dataset/covid19-jokyo">新型コロナウイルス感染症の発生状況</a>を利用しています。<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a>©埼玉県保健医療部</p>
            <p>静岡県のデータセットは、以下の著作物を改変して利用しています。新型コロナウイルス感染症県内感染動向、静岡県、<a href="https://creativecommons.org/licenses/by/2.1/jp/">クリエイティブ・コモンズ・ライセンス表示2.1</a></p>
            <p>和歌山県のデータセットは、<a href="https://github.com/wakayama-pref-org/covid19">新型コロナウイルス感染症に関連する情報</a>を利用しています。<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a>©和歌山県情報政策課</p>
            <p>山梨県のデータセットは、<a href="https://www.pref.yamanashi.jp/koucho/coronavirus/documents/youseisha.xlsx">新型コロナウイルス陽性患者属性</a>を利用しています。<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a>©山梨県福祉保健部健康増進課 </p>
            <p>神奈川県のデータセットは、以下の著作物を改変して利用しています。新型コロナウイルス感染症対策　陽性患者数及び陽性患者の属性データ、神奈川県、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>茨城県のデータセットは、以下の著作物を改変して利用しています。<a href="https://www.pref.ibaraki.jp/1saigai/2019-ncov/ichiran.html">新型コロナウイルス感染症陽性者一覧</a>、茨城県保健福祉部疾病対策課健康危機管理対策室、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>山形県のデータセットは、以下の著作物を改変して利用しています。<a href="https://www.pref.yamagata.jp/ou/kikakushinko/020051/opendata.html">新型コロナウイルス感染症(COVID-19)について</a>、山形県健康福祉企画課、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>青森県のデータセットは、以下の著作物を改変して利用しています。<a href="https://opendata.pref.aomori.lg.jp/dataset/1531.html">青森県の所有する新型コロナウイルス感染症の陽性患者等に関する情報</a>、青森県健康福祉部保健衛生課、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
            <p>滋賀県のデータセットは、以下の著作物を改変して利用しています。<a href="https://stopcovid19.pref.shiga.jp/cards/attributes-of-confirmed-cases/">陽性患者の属性</a>、滋賀県総合企画部情報政策課、<a href="https://creativecommons.org/licenses/by/4.0/deed.ja">クリエイティブ・コモンズ・ライセンス表示4.0国際</a></p>
          </div>
{/*
          <p>
            Data source:{' '}
            <a href="https://en.wikipedia.org/wiki/List_of_United_States_cities_by_population">
              Wikipedia
            </a>
          </p>
          <div className="source-link">
            <a
              href="https://github.com/visgl/react-map-gl/tree/5.2-release/examples/controls"
              target="_new"
            >
              View Code ↗
            </a>
          </div>
*/}
        </div>

        <div className="right">
          <div className="sns-text">
            SHARE:
          </div>
          <div className="sns-icon">
            <a href="https://www.facebook.com/sharer/sharer.php?u=https://www.shizentai-factory.com/covid19map/index.html" target="_blank" rel="noopener noreferrer"><i title="Share by facebook" className="fa fa-facebook fa-big"></i></a>
          </div>
          <div className="sns-icon">
            <a href="https://twitter.com/intent/tweet?url=https://www.shizentai-factory.com/covid19map/index.html&text=COVID-19+NUMBER+OF+INFECTED+MAP+ANIMATION" target="_blank" rel="noopener noreferrer"><i title="Share by Twitter" className="fab fa-twitter-square"></i></a>
          </div>
        </div>
      </div>
    );
  }
}
