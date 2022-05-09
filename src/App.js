import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { getCanvasPosition } from './utils/formulas';
import Canvas from './components/Canvas';
import * as Auth0 from 'auth0-web';
import io from 'socket.io-client';
import { TempleWallet } from '@temple-wallet/dapp';
import axios from 'axios';
// import { useNavigate } from "react-router-dom";


Auth0.configure({
  domain: 'dev-6b879145.us.auth0.com',
  clientID: 'c9tBe6zLFpk2Ys4ecjooVh2fMm9QzF4U',
  redirectUri: 'http://aliensgohome.evolvingpandas.com/',
  grant_type:'client_credentials',
  scope: 'openid profile manage:points manage:address',
  audience: 'https://aliens-go-home.digituz.com.br',
});

class App extends Component {

  constructor(props) {
    super(props);
    this.shoot = this.shoot.bind(this);
    this.socket = null;
    this.currentPlayer = null;
    this.address = null;
  }


  checkWalletConfigurable = async() => {
    
    try {
      const available = await TempleWallet.isAvailable();
      console.log(available);
      if (!available) {
        alert("Kindly install Temple Wallet or Enable it To continue !!");          
        window.location.assign('http://games.evolvingpandas.com/')
        throw new Error("Temple Wallet not installed");
      }
      // Note:
  
      // use `TempleWallet.isAvailable` method only after web application fully loaded.
  
      // Alternatively, you can use the method `TempleWallet.onAvailabilityChange`
      // that tracks availability in real-time .
      const wallet = new TempleWallet("My Super DApp");
      const tezos = await wallet.connect("mainnet").then(()=>{
        const tezos = wallet.toTezos();
          return tezos
      })
      .catch(err=>{
        alert("Kindly Connect your wallet and Try Again");
        window.location.reload(false);
      });
  
      const accountPkh = await tezos.wallet.pkh();
      this.address = accountPkh;
      console.log(this.address);
      const data = await axios.get('https://api.tzkt.io/v1/tokens/balances', {
            params:
          {
          'account':this.address,
          'token.metadata.name.as':'Evolving Pandas*'
          }
        })

        const data2 = await axios.get('https://api.tzkt.io/v1/tokens/balances', {
            params:
          {
          'account':this.address,
          'token.metadata.name.as':'Evolving Pixel Pandas*'
          }
        })

        // for evolving pandas
        if(data.data.length !== 0 || data2.data.length !== 0){
          console.log('Access')
        }
        else{
          console.log('No Access !!!!');
          alert("Kindly buy NFT of Evolving Pandas Go get Access of The Game !!")
          window.location.assign('http://games.evolvingpandas.com/')
        }
      
    } catch (err) {
      console.error(err);
    }
  }

  // function coonect(){
  //   React.useEffect(() => {
  //     return TempleWallet.onAvailabilityChange((available) => {
  //       setState({
  //         wallet: available ? new TempleWallet(appName) : null,
  //         tezos: null,
  //         accountPkh: null,
  //       });
  //     });
  //   }, [setState, appName]);
  // }

  async componentDidMount() { 
    const self = this;
    // const navigate = useNavigate();
    Auth0.handleAuthCallback();
    Auth0.subscribe((auth) => {
      if (!auth) return;

      self.playerProfile = Auth0.getProfile();
      self.currentPlayer = {
        id: self.playerProfile.sub,
        maxScore: 0,
        name: self.playerProfile.name,
        picture: self.playerProfile.picture,
        address:self.address
      };

      this.props.loggedIn(self.currentPlayer);
      self.socket = io('http://localhost:3001', {
        query: `token=${Auth0.getAccessToken()}`,
      });

      self.socket.on('players', (players) => {
        this.props.leaderboardLoaded(players);
        players.forEach((player) => {
          if (player.id === self.currentPlayer.id) {
            self.currentPlayer.maxScore = player.maxScore;
          }
        });
      });
    });

    setInterval(() => {
      self.props.moveObjects(self.canvasMousePosition);
    }, 10);

    window.onresize = () => {
      const cnv = document.getElementById('aliens-go-home-canvas');
      cnv.style.width = `${window.innerWidth}px`;
      cnv.style.height = `${window.innerHeight}px`;
    };
    window.onresize();
    window.addEventListener('load', this.checkWalletConfigurable());

  }


  componentWillReceiveProps(nextProps) {
    if (!nextProps.gameState.started && this.props.gameState.started) {
      if (!this.currentPlayer) return;
      if (this.currentPlayer.maxScore < this.props.gameState.kills) {
        this.socket.emit('new-max-score', {
          ...this.currentPlayer,
          maxScore: this.props.gameState.kills,
        });
      }
    }
  }

  trackMouse(event) {
    this.canvasMousePosition = getCanvasPosition(event);
  }

  shoot() {
    this.props.shoot(this.canvasMousePosition);
  }

  render() {
    return (
        <Canvas
        angle={this.props.angle}
        currentPlayer={this.props.currentPlayer}
        gameState={this.props.gameState}
        players={this.props.players}
        startGame={this.props.startGame}
        trackMouse={event => (this.trackMouse(event))}
        shoot={this.shoot}
      />
    );
  }
}

App.propTypes = {
  angle: PropTypes.number.isRequired,
  gameState: PropTypes.shape({
    started: PropTypes.bool.isRequired,
    kills: PropTypes.number.isRequired,
    lives: PropTypes.number.isRequired,
  }).isRequired,
  flyingObjects: PropTypes.arrayOf(PropTypes.shape({
    position: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }).isRequired,
    id: PropTypes.number.isRequired,
  })).isRequired,
  moveObjects: PropTypes.func.isRequired,
  startGame: PropTypes.func.isRequired,
  currentPlayer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    maxScore: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    picture: PropTypes.string.isRequired,
  }),
  leaderboardLoaded: PropTypes.func.isRequired,
  loggedIn: PropTypes.func.isRequired,
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    maxScore: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    picture: PropTypes.string.isRequired,
  })),
  shoot: PropTypes.func.isRequired,
};

App.defaultProps = {
  currentPlayer: null,
  players: null,
};

export default App;
