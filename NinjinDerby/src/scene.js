//描画装置系
var renderer;
var scene;
var camera;
//3Dオブジェクト系
var Mine; /* 自分の馬 */
var Enemy;/* 敵の馬 */
var fences=[]; /* 内ラチ柵配列 */
var goal,base; /* ゴール板・土台 */
var HPbar, HPflame; /* HP残量バーと枠,位置参照ダミー */
var SLight; /* HPバー表示用スポットライト */
var title; /*タイトルロゴ */
var lapsign; /* ラップ数表示する看板 */
//アニメーション描画系
let mixer; /* アニメーションミキサー */
let Enemixer; /* 敵アニメーションミキサー */
var waitaction; /* 待機モーション3D */ 
var runaction; /* 走るモーション3D */
var currentaction; /* 現在のモーション3D */
var Enewaitaction; /* 敵・待機モーション3D */ 
var Enerunaction; /* 敵・走るモーション3D */
var Enecurrentaction; /* 敵・現在のモーション3D */
//フラグ・制御系
let flag=0; /* スタンバイ・ステージアニメーション開始フラグ */
let started=0; /* 出走したか否かのフラグ */
let Gflag=0; /* 最終ゴールフラグ */
let Nflag = 0; /* 北(向こう正面)通過フラグ */
let Sflag = 1; /* 南(ゴール板)通過フラグ */
let laps = 0; /* 経過ラップ数 */
let EneNflag = 0; /* 敵機・北(向こう正面)通過フラグ */
let EneSflag = 1; /* 敵機・南(ゴール板)通過フラグ */
let Enelaps = 0; /* 敵機・経過ラップ数 */
let horizontal=0; /* 馬とカメラの向き調整用水平方向媒介変数 */
let vertical=0; /* カメラの向き調整用垂直方向媒介変数　*/
//定数
const width = window.innerWidth; //ウインドウ幅
const height = window.innerHeight;//ウインドウ高さ

//自機の情報
class MYINFO{
	constructor(){
		this.speed = 0.1 /* 速度(基本0.1,キー連続押下時間に応じて加速) */
		this.stamina = 512; /* スタミナ */
		this.healflag = 0; /* 回復フラグ */
	}
};

main();
function main(){
	createRender();
	scene = new THREE.Scene(); 
	createCamera();
	camera.position.set(40,100,50);
	camera.rotation.set(-1.2,0.3,0.3);
	floor = createFloor();
	floor.scale.set(2.5,1,2.5)

	//タイトルロゴ表示
	title=createTitle();
	title.position.set(22,50,30);
	title.rotation.set(-1.2,0.3,0.305);

	//にんじん設置
	setCarrot(1);//オーダー1:大小どっちも設置
		
	//内ラチ作成
	makeFences();
	
	//自機 
	//自作glbファイルからアニメーション付き3Dモデルを読み込み
	//グローバル変数Mineに格納
	createHorse(0);	
	myinfo = new MYINFO();

	//敵機
	//自作glbファイルからアニメーション付き3Dモデルを読み込み
	//グローバル変数Enemyに格納
	createHorse(1);
	
	//観客席北
	standN=createStand();
	standN.position.set(0,6,-50)
	stand.rotation.x = 0.9;

	//観客席南
	standS=createStand();
	standS.position.set(0,6,48)
	stand.rotation.x = -0.9;
	standS.rotation.y = -Math.PI;

	//ゴール板
	goal=createGoal();
	goal.scale.set(0.8,0.8,0.8);
	goal.position.set(3,0,15);
	base=createBase();
		goal.add(base);

	//スタミナ残量バー
	HPflame=createHPflame();
	HPflame.visible=false;
		HPbar=createBar();
		HPflame.add(HPbar);
		HPbar.position.set(0,-1.3,0.1);
		//バーを常時明るく表示
		SLight=createSLight(0,0,0);
		HPflame.add(SLight);
		SLight.position.set(0,0,20);
		SLight.target=HPflame;
		SLight.castShadow=false;
	
	//ラップ数表示する看板
	lapsign=createLapsign(1);
	lapsign.visible=false;


	//メインライト・グラウンド
	//回転軸 light shaft
	lshaft=createBar();
	lshaft.position.set(0,-5,0);
		PLight=createPLight(0,0,0); 
		PLight.position.set(-25,30,-10);
		PLight.castShadow=true;
		lshaft.add(PLight);
	floor.receiveShadow = true; 
	renderer.shadowMap.enabled = true;
	run();
}

function run() {
	//fragが1のときだけ回転
	if(flag==1){
		carrotL.rotation.y+=0.01;//自転、子は公転
		carrotS.rotation.y+=0.04;//自転、子は公転
		lshaft.rotation.y+=0.005;//光軸回転によるライト公転

		//スタンバイ中のカメラ移動
		if(started==0){
			if(camera.position.x>Mine.position.x-15){
				camera.position.x-=0.1;
			}
			if(camera.position.y>Mine.position.y+4){
				camera.position.y-=0.3;
			}
			if(camera.position.z>Mine.position.z){
				camera.position.z-=0.05;
			}
			Mine.rotation.set(0,Math.PI/2,0);   
			camera.lookAt(Mine.position.x,Mine.position.y+6,Mine.position.z);
			Enemy.rotation.set(0,Math.PI/2,0);  
		}

		//出走後の処理
		else{
			//カメラ追従・自機馬の向き調整
			Mine.rotation.y+=horizontal;
			camera.lookAt(Mine.position.x,Mine.position.y+2+vertical,Mine.position.z);
			camera.position.set(0,9,-18);
			//にんじん取得チェック(座標による制御)
			checkCarrot();
			//相手の動き
			enerun();
			//HPバー減衰
			HPbar.scale.y = myinfo.stamina/512; 
			//スタミナチェック・HPバー変色処理
			checkStamina();
			//ゴールチェック
			checkGoal();
		}
	}
	if (mixer) mixer.update(0.017);
	if(Enemixer) Enemixer.update(0.017);
	renderer.render(scene, camera);
	requestAnimationFrame(run);
}

function createSLight(x,y,z){
	color = new THREE.Color("rgb(255,255,255)");
	light = new THREE.SpotLight();  
	light.color.set(color);
	light.intensity=0.8;
	light.position.set(x,y,z);  
	//light.distance=300;
	scene.add(light);
	return light
}

function createPLight(x,y,z){
	color = new THREE.Color("rgb(255,255,255)");
	light = new THREE.PointLight();  
	
	light.color.set(color);
	light.intensity=1.4;
	light.position.set(x,y,z);   
	light.distance=500;
	light.decay=0.8;
	scene.add(light);
	return light
}

function createCamera(){
	camera = new THREE.PerspectiveCamera(45, 
		width / height, 1, 10000);
}

function createRender(){
	container = document.getElementById('container');
	renderer = new THREE.WebGLRenderer({alpha:true,});             
	renderer.setSize(width, height); 
	container.appendChild(renderer.domElement);  
}

//内ラチ作成関数
function makeFences(){
	//createFence関数を呼びまくって内ラチ柵を並べる fences配列に格納
	//直線
	for(z=0;z<=1;z++){/* 手前->奥 */
		for(i=0;i<=4;i++){
			fences.push(createFence(-15+i*8.1,14-z*40,Math.PI*z)); /* 横並びの柵を配列に格納 */
		}
	}
	for(i=1;i<=8;i++){/* 右サイドカーブ */
		fences.push(createFence(17+20*Math.cos(Math.PI/18*(2*i-9)),-6-20*Math.sin(Math.PI/18*(2*i-9)),Math.PI/9*i));
	}
	for(i=1;i<=8;i++){/* 左サイドカーブ */
		fences.push(createFence(-15+20*Math.cos(Math.PI/18*(2*i+9)),-6-20*Math.sin(Math.PI/18*(2*i+9)),Math.PI/9*(i+9)));
	}
}

//にんじん作成・設置関数(初期化・再配置を引数で制御)
//order:1->all 0->carrotSだけ 2->carrotLだけ
function setCarrot(order){
	if(order>=1){ 
		//にんじん大
		carrotL=createCarrot();
		carrotL.position.set(45-Math.random()*90,0,-25-Math.random()*15);//絶対座標
			leafL=createLeaf();
			carrotL.add(leafL);//leafをcarrotの子に
			leafL.position.set(0,0,0); //相対座標	
	}
	if(order<=1){
		//にんじん小
		carrotS=createCarrot();
		carrotS.scale.set(0.5,0.5,0.5);//小さめに
		carrotS.position.set(-50+Math.random()*15,0,-20+Math.random()*50);//絶対座標
			leafS=createLeaf();
			carrotS.add(leafS);//leafをcarrotの子に
			leafS.position.set(0,0,0); //相対座標
	}
}

//相手の移動関数(機械的な動きにはなってしまうが)
function enerun(){
	if(Enemy.position.x>-45 && Enemy.position.x<43 && Enemy.position.z>=21){
		Enemy.position.x+=0.25; //→
		Enemy.rotation.y=Math.PI/2;
	}
	else if(Enemy.position.x>0 && Enemy.position.z>-28){
		Enemy.position.z-=0.3; //↑
		Enemy.rotation.y=Math.PI;
	}
	else if(Enemy.position.z<=-28 && Enemy.position.x>=-43 && Enemy.position.x<=45){
		Enemy.position.x-=0.25; //←
		Enemy.rotation.y=-Math.PI/2;
	}
	else if(Enemy.position.x<0 && Enemy.position.z<=21){
		Enemy.position.z+=0.35; //↓
		Enemy.rotation.y=0
	}
}

//人参取得チェック
function checkCarrot(){
	//各にんじんとウマとのx-z平面距離を取得
	distanceL=Math.sqrt((carrotL.position.x - Mine.position.x)**2) + Math.sqrt((carrotL.position.z-Mine.position.z)**2);
	distanceS=Math.sqrt((carrotS.position.x - Mine.position.x)**2) + Math.sqrt((carrotS.position.z-Mine.position.z)**2);
	//大にんじんチェック
	if(distanceL<5){
		console.log("carrotL get");
		myinfo.stamina+=200; //スタミナ回復
		if(myinfo.stamina>512){//回復上限
			myinfo.stamina=512;
		}
		//promiseで非同期じゃない順番を作る
		new Promise((resolve)=>{
			scene.remove(carrotL); //carrotLメッシュを削除
			resolve();
		}).then(()=>{
			setCarrot(2); //order:大にんじんのみ設置
		});
	}
	//小にんじんチェック
	if(distanceS<5){
		console.log("carrotS get");
		myinfo.stamina+=100; //スタミナ回復
		if(myinfo.stamina>512){//回復上限
			myinfo.stamina=512;
		}
		//promiseで非同期じゃない順番を作る
		new Promise((resolve)=>{
			scene.remove(carrotS); //carrotLメッシュを削除
			resolve();
		}).then(()=>{
			setCarrot(0); //order:小にんじんのみ設置
		});
	}
}

//スタミナチェック・HPバー変色
function checkStamina(){
	if(myinfo.healflag==0){
		if(myinfo.stamina>=255){//緑~黄
			r=(512-(myinfo.stamina-myinfo.stamina%1))/255;
			HPbar.material.color = new THREE.Color(r, 1, 0);
		}
		else if(myinfo.stamina<=255 && myinfo.stamina > 0){//黄~赤
			g=myinfo.stamina/255;
			HPbar.material.color = new THREE.Color(1, g, 0);
		}
		else{ /* スタミナ切れチェック */
			myinfo.healflag=1; /* スタミナ切れの場合は自然回復フラグを立てる */
			console.log("stamina runs out");
		}
	}
	else{ /* スタミナ切れの時 */
		if(myinfo.stamina >= 300){ /* 回復するまではヘロヘロ */
			myinfo.healflag = 0; /* 自然回復フラグ解消 */
			console.log("energy was charged");
		}
		else{
			myinfo.stamina += 1.5; /* 自然回復 */
		}
	}
}

//衝突判定チェック
function checkCollision(){
	//Raycasterによる衝突判定がうまくいかなかったので柵の座標で判定を行う
	//全部の柵に対して捜査
	for(i=0;i<fences.length;i++){ //柵とウマの距離が1以内の場合は衝突しちゃってる
		dist = Math.sqrt((fences[i].position.x-Mine.position.x)**2)+Math.sqrt((fences[i].position.z-Mine.position.z)**2);
		if(dist <= 4.05){ /* 柵幅8.1間隔だから */
			console.log("COLLISION");
			myinfo.speed-=0.01;
			return 1; //衝突してたら1を返す
		}
	}
	return 0;
}

//ゴールチェック
function checkGoal(){
	//自機
	//北・向こう正面通過チェック
	if(Sflag==1){
		if(Mine.position.z<-20){
			Nflag=1; /* 通過フラグを立てる */
			Sflag=0; /* 南通過フラグを下す */
		}
	}
	//南・ゴール板通過チェック
	else if(Nflag==1){
		if(Mine.position.z>20 && Mine.position.x>0.2){
			Sflag=1; /* 通過フラグを立てる */
			Nflag=0; /* 北通過フラグをおろす */
			laps+=1; /* ラップをカウントする */
			console.log("laps:"+laps);
			if(laps<2){
				//ラップ数表示を進める 
				new Promise((resolve)=>{
					scene.remove(lapsign); //現在の表示オブジェクトを削除
					resolve();
				}).then(()=>{
					lapsign = createLapsign(laps+1); //ラップ数を進めて再生成
					return 0;
				}).then(()=>{
					Mine.add(lapsign);
					lapsign.rotation.set(0,Math.PI,0); //相対transform調整
					lapsign.position.set(-11,4,3);
				});
			}
			else{
				Gflag=1; /* ゴールフラグを立てる */
			}
		}
	}

	//敵機
	//北・向こう正面通過チェック
	if(EneSflag==1){
		if(Enemy.position.z<-20){
			EneNflag=1; /* 通過フラグを立てる */
			EneSflag=0; /* 南通過フラグを下す */
		}
	}
	//南・ゴール板通過チェック
	else if(EneNflag==1){
		if(Enemy.position.z>20 && Enemy.position.x>0.2){
			EneSflag=1; /* 通過フラグを立てる */
			EneNflag=0; /* 北通過フラグをおろす */
			Enelaps+=1; /* ラップをカウントする */
			console.log("Enelaps:"+Enelaps);
		}
	}
	//最終ゴールチェック・結果表示
	//規定ラップ数経過チェック(ゴール) 3に設定
	if(Gflag==1){
		console.log("GOAL");
		flag=0;
		currentaction.paused=true;/* モーション等を停止 */
		currentaction=waitaction;  /* 待機で描画はし続けておく */
		Enecurrentaction.paused=true;/* モーション等を停止 */
		Enecurrentaction=Enewaitaction;  /* 待機で描画はし続けておく */
		//勝敗判定
		if(laps>Enelaps){ /* 相手より先にゴール:勝ち */
			result = createResult("win.png");
			console.log("WIN!");
		}
		else{ /* 相手の方が先にゴール:負け */
			result = createResult("lose.png");
			console.log("LOSE...")
		}
		Mine.add(result);
			result.position.set(0,15,0);
			result.scale.set(1,1,1);
			result.rotation.set(0,Math.PI,0)
	}
}

//出走準備(pキー)
function standby(){
	//promiseで非同期じゃない順番を作る
	new Promise((resolve)=>{
		currentaction=waitaction; //待機モーション
		Enecurrentaction=Enewaitaction; //待機モーション
		resolve();
	}).then(()=>{
		flag=1;
		scene.add(Mine); //モーションスタートして配置
		currentaction.play();
		scene.add(Enemy); //モーションスタートして配置
		Enecurrentaction.play();
		return "done";
	}).then(()=>{	//位置調整		
		Mine.position.set(0,0,25);
		Mine.scale.set(0.2,0.2,0.2);
		currentaction.paused=false;
		Enemy.position.set(0,0,22);
		Enemy.scale.set(0.2,0.2,0.2);
		Enecurrentaction.paused=false;
	});
}

//key入力の取得 e=イベント
document.onkeydown = function(e){
	/* キーデータ取得 */
	if(!e) e = window.event;

	switch(e.key){
		//キーがpならflagを1にして待機アニメーションスタート
		case 'p':
			if(flag==0 && Gflag==0){ /* スタンバイは1回だけ */
				title.visible=false;				
				standby();
			}
			break;
	
		//wasdで自機操作
		case 'w':	//上
			//出走中で
			if(currentaction==runaction){
				//フェンスに衝突していなくて
				if(checkCollision()==0){
					//場外じゃなくて(出たら戻す)
					if(Mine.position.x<-58){
						Mine.position.x=-58
						myinfo.speed-=0.01;
					}
					else if(Mine.position.x>58){
						Mine.position.x=58;
						myinfo.speed-=0.01;
					}
					//衝突判定チェック(ぶつかってない)
					else{
						//元気があるなら加速しつつ移動、スタミナ減少
						if(myinfo.healflag==0){
							myinfo.speed+=0.0025;
							myinfo.stamina-= 0.15 + (myinfo.speed-0.1)*0.7;
						}
						//元気がないなら0.05で低速移動
						else{
							myinfo.speed=0.05;
						}
						Mine.position.x+=myinfo.speed*Math.sin(Mine.rotation.y);
					}
					//場外じゃなくて(出たら戻す)
					if(Mine.position.z<-42){
						Mine.position.z=-42;
						myinfo.speed-=0.01;
					}
					else if(Mine.position.z>36){
						Mine.position.z=36;
						myinfo.speed-=0.01;
					}
					//衝突判定チェック(ぶつかってない)
					else{
						//元気があるなら加速しつつ移動、スタミナ減少
						if(myinfo.healflag==0){
							myinfo.speed+=0.0025;
							myinfo.stamina-=0.15 + (myinfo.speed-0.1)*0.7;
						}
						//元気がないなら0.05で低速移動
						else{
							myinfo.speed=0.05;
						}
						Mine.position.z+=myinfo.speed*Math.cos(Mine.rotation.y);
					}
				}
				else{ //衝突していたら加速はせずに位置を今の向きに対して外側へ0.1分ずらす
					Mine.position.x+=0.1*Math.sin(Mine.rotation.y-Math.PI/2);
					Mine.position.z+=0.1*Math.cos(Mine.rotation.y-Math.PI/2);
					myinfo.stamina-=myinfo.speed;
				}
			}
			break;

		case 'a':	//左
			//出走中で
			if(currentaction==runaction){
				//フェンスに衝突していなくて
				if(checkCollision()==0){
					//場外じゃなくて(出たら戻す)
					if(Mine.position.x<-58){
						Mine.position.x=-58
						myinfo.speed-=0.01;
					}
					else if(Mine.position.x>58){
						Mine.position.x=58;
						myinfo.speed-=0.01;
					}
					else{
						//元気があるなら加速しつつ移動、スタミナ減少
						if(myinfo.healflag==0){
							myinfo.speed+=0.005;
							myinfo.stamina-=myinfo.speed;
						}
						//元気がないなら0.05で低速移動
						else{
							myinfo.speed=0.05;
						}
						Mine.position.x+=myinfo.speed*Math.sin(Mine.rotation.y+Math.PI/2);
					}
					//場外じゃなくて(出たら戻す)
					if(Mine.position.z<-42){
						Mine.position.z=-42;
						myinfo.speed-=0.01;
					}
					else if(Mine.position.z>36){
						Mine.position.z=36;
						myinfo.speed-=0.01;
					}
					else{
						//元気があるなら加速しつつ移動、スタミナ減少
						if(myinfo.healflag==0){
							myinfo.speed+=0.005;
							myinfo.stamina-=myinfo.speed;
						}
						//元気がないなら0.05で低速移動
						else{
							myinfo.speed=0.05;
						}
						Mine.position.z+=myinfo.speed*Math.cos(Mine.rotation.y+Math.PI/2);
					}
				}
				else{ //衝突していたら位置を今の向きに対して外側へ0.1分ずらす
					Mine.position.x+=0.1*Math.sin(Mine.rotation.y-Math.PI/2);
					Mine.position.z+=0.1*Math.cos(Mine.rotation.y-Math.PI/2);
					myinfo.stamina-=myinfo.speed;
				}
			}
			break;

		case 's':	//下 
			//出走中で
			if(currentaction==runaction){
				//場外じゃなくて(出たら戻す)
				if(Mine.position.x<-58){
					Mine.position.x=-58
				}
				else if(Mine.position.x>58){
					Mine.position.x=58;
				}
				else{
					//元気があるなら加速しつつ移動、スタミナ減少
					if(myinfo.healflag==0){
						myinfo.speed+=0.005;
						myinfo.stamina-=myinfo.speed;
					}
					//元気がないなら0.05で低速移動
					else{
						myinfo.speed=0.05;
					}
					Mine.position.x+=myinfo.speed*Math.sin(Mine.rotation.y+Math.PI);
				}
				//場外じゃなくて(出たら戻す)
				if(Mine.position.z<-42){
					Mine.position.z=-42;
				}
				else if(Mine.position.z>36){
					Mine.position.z=36;
				}
				else{
					//元気があるなら加速しつつ移動、スタミナ減少
					if(myinfo.healflag==0){
						myinfo.speed+=0.005;
						myinfo.stamina-=myinfo.speed;
					}
					//元気がないなら0.05で低速移動
					else{
						myinfo.speed=0.05;
					}
					Mine.position.z+=myinfo.speed*Math.cos(Mine.rotation.y+Math.PI);	
				}
			}
			break;

		case 'd':	//右
			//出走中で
			if(currentaction==runaction){
				//場外じゃなくて(出たら戻す)
				if(Mine.position.x<-58){
					Mine.position.x=-58
				}
				else if(Mine.position.x>58){
					Mine.position.x=58;
				}
				else{
					//元気があるなら加速しつつ移動、スタミナ減少
					if(myinfo.healflag==0){
						myinfo.speed+=0.005;
						myinfo.stamina-=myinfo.speed;
					}
					//元気がないなら0.05で低速移動
					else{
						myinfo.speed=0.05;
					}
					Mine.position.x+=myinfo.speed*Math.sin(Mine.rotation.y-Math.PI/2);
				}
				//場外じゃなくて(出たら戻す)
				if(Mine.position.z<-42){
					Mine.position.z=-42;
				}
				else if(Mine.position.z>36){
					Mine.position.z=36;
				}
				else{
					//元気があるなら加速しつつ移動、スタミナ減少
					if(myinfo.healflag==0){
						myinfo.speed+=0.005;
						myinfo.stamina-=myinfo.speed;
					}
					//元気がないなら0.05で低速移動
					else{
						myinfo.speed=0.05;
					}
					Mine.position.z+=myinfo.speed*Math.cos(Mine.rotation.y-Math.PI/2);
				}
			}
			break;

		//出走!!	
		case 'x':	
			if(flag==1){	
				new Promise((resolve)=>{
					currentaction=runaction;
					Enecurrentaction=Enerunaction;
					Mine.add(HPflame);
					Mine.add(lapsign);
					resolve();
				}).then(()=>{
					flag=1;
					scene.add(Mine);
					currentaction.play();
					scene.add(Enemy);
					Enecurrentaction.play();
					HPflame.scale.set(3,5,3);
					HPflame.rotation.set(0,-Math.PI-0.4,0);
					HPflame.position.set(-8,7,10);
					HPflame.visible=true;
					lapsign.rotation.set(0,Math.PI,0);
					lapsign.position.set(-11,4,3);
					lapsign.visible=true;
					//console.log("action is started");
					return "done";
				}).then((val)=>{			
					Mine.position.set(0,0,25);
					Mine.scale.set(0.2,0.2,0.2);
					Enemy.position.set(0,0,22);
					Enemy.scale.set(0.2,0.2,0.2);
					//console.log('then1:'+val);
					return val;
				}).then(()=>{
					currentaction.paused=false;
					Enecurrentaction.paused=false;
					started=1;
					Mine.add(camera); /* カメラを自機の子に */
					//console.log('then2:'+val);
				});	
			}
			break;
	}
};

//key離した情報の取得 e=イベント
document.onkeyup = function(){
	//加速をなくす
	myinfo.speed=0.1;
}

//マウスが動いたときに実行される
document.onmousemove = function(e){
	//出走後の馬向き調整(変位のみ取得、加算はrun()内で)
	if(flag==1){
		//マウスの現在位置を取得,ウインドウサイズにおける割合を導出
		mx = e.clientX/width;
		my = e.clientY/height;

		if(mx<=0.3){ /* 左側30%以下 */
			horizontal+=0.001;
		}
		else if(mx>=0.7){ /* 右側70%以上 */
			horizontal-=0.001;
		}

		else if(my<=0.3){ /* 下側30%以下 */
			vertical+=0.02;
		}
		else if(my>=0.7){ /* 上側70%以上 */
			vertical-=0.02;
		}
		else{
			vertical=0; /* 変化域を外れたらカメラ上下変位量リセット*/
			horizontal=0;
		}
	}
};
