// http://k-hiura.cocolog-nifty.com/blog/2020/06/post-2e42ed.html
import java.io.File;
import java.io.*;
import java.net.InetSocketAddress;
import com.sun.net.httpserver.*;
public class MiniHttpServer implements HttpHandler {
	static final int PORT = 8000;
	static final String BASE = "./src";

	static final boolean D=true;

	static boolean index_jump;
	static PrintStream pr=System.err;
	public static void main(String[] args) throws Exception {
		MiniHttpServer miniHttpServer = new MiniHttpServer();

		HttpServer _server = HttpServer.create(new InetSocketAddress(PORT), 0);
		_server.createContext("/", miniHttpServer);
		if(D){pr.println("miniHttpSever started, wating at port "+PORT);}
		_server.start();
	}
	
	@Override
	public void handle(HttpExchange http_) throws IOException {
		//if(D)pr.println(http_.getRequestMethod()+" "+http_.getRequestURI());
		OutputStream _out = http_.getResponseBody();

		try{
				String _pathName=BASE+http_.getRequestURI();
				File   _file    =new File(_pathName);
				boolean _dirStyle= _pathName.endsWith("/");
				byte[] _buf=null;
				if(_file.isFile()&&!_dirStyle) {
				// htmlファイル等読み込み
					try(InputStream _is = new FileInputStream(_file)){
						_buf = new byte[(int)_file.length()];
						_is.read(_buf);
					}catch(Exception _ex){throw _ex;}
				}
				else if(_file.isDirectory() && _dirStyle ){
					// フォルダの場合ファイルリストを出す
					StringBuilder _sb = new StringBuilder();
					_sb.append("<html><title></title><body><a href=\"../\">../</a><br>\n");
					String _indexFile=null;
					for(File f : _file.listFiles()) {
						String name = f.isDirectory()?f.getName()+"/" : f.getName();
						_sb.append("<a href=\"").append(name).append("\">")
						.append(name).append("</a><br>\n");
						if( name.startsWith("index.htm")){ _indexFile=name;}
					}
					_sb.append("</body></html>");
					_buf = _sb.toString().getBytes();
				}

				if( _buf!=null ){
					http_.sendResponseHeaders(200, _buf.length);
					_out.write(_buf);
					//if(D){pr.println("ok/200");}
				}
		}
		catch (Exception _ex) {}
		finally {
			_out.close();
			http_.close();
		}
	}
}
