from flask import Flask

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
@app.route('/chapters')
@app.route('/chapters/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    # Usa a porta 5050 para não colidir com seus outros projetos
    app.run(host='127.0.0.1', port=5050)