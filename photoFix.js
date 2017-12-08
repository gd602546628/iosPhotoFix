/**
 * Created by gd on 2017/12/8/007.
 *
 *   @params File
 *   @return Promise  @resolve File
 *   对file图片对象进行处理
 *   解决 ios 手机竖拍的照片上传 会被旋转90度的问题
 */
import EXIF from 'exif-js'
// 将图像放入canvas中旋转
function rotateImg(img, direction, canvas) {
  //最小与最大旋转方向，图片旋转4次后回到原方向
  let min_step = 0
  let max_step = 3
  //let img = document.getElementById(pid)
  if (img == null)return
  //img的高度和宽度不能在img元素隐藏后获取，否则会出错
  let height = img.height
  let width = img.width
  let step = 2
  if (step == null) {
    step = min_step
  }
  if (direction == 'right') {
    step++
    //旋转到原位置，即超过最大值
    step > max_step && (step = min_step)
  } else {
    step--
    step < min_step && (step = max_step)
  }
  let degree = step * 90 * Math.PI / 180
  let ctx = canvas.getContext('2d')
  switch (step) {
    case 0:
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      break
    case 1:
      canvas.width = height
      canvas.height = width
      ctx.rotate(degree)
      ctx.drawImage(img, 0, -height, width, height)
      break
    case 2:
      canvas.width = width
      canvas.height = height
      ctx.rotate(degree)
      ctx.drawImage(img, -width, -height, width, height)
      break
    case 3:
      canvas.width = height
      canvas.height = width
      ctx.rotate(degree)
      ctx.drawImage(img, -width, 0, width, height)
      break
  }
}
// base64转换blob对象
function convertBase64UrlToBlob(urlData) {

  var bytes = window.atob(urlData.split(',')[1]);        //去掉url的头，并转换为byte

  //处理异常,将ascii码小于0的转换为大于0
  var ab = new ArrayBuffer(bytes.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }

  let blob = new Blob([ab], {type: 'image/jpeg'})
  return blob
}

function fixPhoto(file) {
  return new Promise((resolve, reject) => {
    let orientation = null
    EXIF.getData(file, function () {
      EXIF.getAllTags(this)
      orientation = EXIF.getTag(this, 'Orientation')
      console.log(orientation)
      if (orientation) {
        let oReader = new FileReader()
        oReader.onload = function (e) {
          let image = new Image()
          image.src = e.target.result
          image.onload = function () {
            let expectWidth = this.naturalWidth
            let expectHeight = this.naturalHeight
            // 图片尺寸过大的话，在低版本ios无法通过canvas绘画，所以进行压缩
            if (this.naturalWidth > this.naturalHeight && this.naturalWidth > 800) {
              expectWidth = 800;
              expectHeight = expectWidth * this.naturalHeight / this.naturalWidth;
            } else if (this.naturalHeight > this.naturalWidth && this.naturalHeight > 1200) {
              expectHeight = 1200;
              expectWidth = expectHeight * this.naturalWidth / this.naturalHeight;
            }
            let canvas = document.createElement("canvas")
            let ctx = canvas.getContext("2d")
            canvas.width = expectWidth
            canvas.height = expectHeight
            this.width = expectWidth
            this.height = expectHeight
            ctx.drawImage(this, 0, 0, expectWidth, expectHeight)
            let base64 = null
            if (navigator.userAgent.match(/iphone/i)) {
              //如果方向角不为1，都需要进行旋转 added by lzk
              if (orientation != "" && orientation != 1) {
                switch (orientation) {
                  case 6://需要顺时针（向左）90度旋转
                    rotateImg(this, 'left', canvas)
                    break
                  case 8://需要逆时针（向右）90度旋转
                    rotateImg(this, 'right', canvas)
                    break
                  case 3://需要180度旋转
                    rotateImg(this, 'right', canvas)//转两次
                    rotateImg(this, 'right', canvas)
                    break
                }
              }
              base64 = canvas.toDataURL("image/jpeg", 0.8)
              resolve(convertBase64UrlToBlob(base64))
              // resolve(base64)
            } else {
              resolve(file)
            }
          }
        }
        oReader.readAsDataURL(file)
      }
      else {
        resolve(file)
      }
    })
  })
}

export default fixPhoto

